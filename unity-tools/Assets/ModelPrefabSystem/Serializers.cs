using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEditor;

static class ModelDataFileSerializer
{
/*  struct ModelDataFile
    {
        numMeshes: byte
        meshes: Mesh[numMeshes]

        numPrefabs: byte
        prefabs: Prefab[numPrefabs]
    }

    struct Prefab
    {
        childCount: byte
        children: ObjectChild[childCount]
    }

    struct ObjectChild
    {
        isPrefab: bit
        rotationWsign: bit
        itemIndex: 6bit

        pos: 3byte
        scale: 3byte
        rotation: 3byte
    }

    struct Mesh
    {
        flatShaded: bit
        materialIndex: 7bit

        scale: 3byte
        originX: 3byte

        numVerts: byte
        verts: 3byte[numVerts]

        numTris: byte
        tris: 3byte[numTris]
    }
*/
    public static byte[] Serialize(GameObject topParent)
    {
        var meshes = topParent.GetComponentsInChildren<MeshFilter>()
            .Select(x => x.sharedMesh)
            .Distinct()
            .ToArray();

        var prefabPaths = topParent.GetComponentsInChildren<Transform>()
            .Where(x => PrefabUtility.IsAnyPrefabInstanceRoot(x.gameObject))
            .Select(x => PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(x))
            .Distinct()
            .ToArray();

        var result = new List<byte>();

        result.Add((byte)meshes.Length);

        foreach (var mesh in meshes)
            result.AddRange(serializeMesh(mesh, false, 0));

        result.Add((byte)prefabPaths.Length);

        foreach (var path in prefabPaths)
            result.AddRange(serializePrefab(meshes, prefabPaths, AssetDatabase.LoadAssetAtPath(path, typeof(GameObject)) as GameObject));

        return result.ToArray();
    }

    public static GameObject Deserialize(byte[] data)
    {
        int ptr = 0;

        var numMeshes = data[ptr++];
        var meshes = new List<Mesh>();

        for (var i = 0; i < numMeshes; ++i)
        {
            var newMesh = deserializeMesh(data, ref ptr);
            meshes.Add(newMesh.mesh);
        }

        var numPrefabs = data[ptr++];
        var prefabs = new List<DeserializedChild[]>();

        var result = new GameObject("AllObject_EXPORTED");

        for (var i = 0; i < numPrefabs; ++i)
        {
            var newPrefab = deserializePrefab(data, ref ptr);
            prefabs.Add(newPrefab);
        }

        for (var i = 0; i < numPrefabs; ++i)
            instantiatePrefab(meshes, prefabs, i).transform.parent = result.transform;

        return result;
    }

    static GameObject instantiatePrefab(IList<Mesh> meshes, IList<DeserializedChild[]> prefabs, int prefabIndex)
    {
        var result = new GameObject("PrefabObject");
        var prefab = prefabs[prefabIndex];

        foreach (var child in prefab)
        {
            var childObject = child.isPrefab
                ? instantiatePrefab(meshes, prefabs, child.itemIndex)
                : instantiateMeshObject(meshes[child.itemIndex]);

            childObject.transform.parent = result.transform;
            childObject.transform.localPosition = child.position;
            childObject.transform.localRotation = child.rotation;
            childObject.transform.localScale = child.scale;
        }

        return result;
    }

    static GameObject instantiateMeshObject(Mesh mesh)
    {
        var result = new GameObject("MeshObject");
        result.AddComponent<MeshFilter>().sharedMesh = mesh;
        result.AddComponent<MeshRenderer>();
        return result;
    }

    static byte[] packPrefabVec3(Vector3 f)
    {
        return new byte[] {
            (byte)((f.x + 2.0f) / 4.0f * 256.0f),
            (byte)((f.y + 2.0f) / 4.0f * 256.0f),
            (byte)((f.z + 2.0f) / 4.0f * 256.0f)
        };
    }

    static byte[] packPrefabQuat(Quaternion f)
    {
        return new byte[] {
            (byte)((f.x + 1.0f) / 2.0f * 256.0f),
            (byte)((f.y + 1.0f) / 2.0f * 256.0f),
            (byte)((f.z + 1.0f) / 2.0f * 256.0f)
        };
    }

    static Vector3 unpackPrefabVec3(byte[] data, ref int ptr)
    {
        float x = data[ptr++] / 256.0f * 4.0f - 2.0f;
        float y = data[ptr++] / 256.0f * 4.0f - 2.0f;
        float z = data[ptr++] / 256.0f * 4.0f - 2.0f;

        return new Vector3(x, y, z);
    }

    static Quaternion unpackPrefabQuat(float wSign, byte[] data, ref int ptr)
    {
        float x = data[ptr++] / 256.0f * 2.0f - 1.0f;
        float y = data[ptr++] / 256.0f * 2.0f - 1.0f;
        float z = data[ptr++] / 256.0f * 2.0f - 1.0f;

        return new Quaternion(x, y, z, wSign * Mathf.Sqrt(1.0f - x*x - y*y - z*z));
    }

    static byte[] serializePrefab(IList<Mesh> allMeshes, IList<string> prefabPaths, GameObject prefab)
    {
        var result = new List<byte>();

        result.Add((byte)prefab.transform.childCount);

        foreach (Transform child in prefab.transform)
            result.AddRange(serializeChild(allMeshes, prefabPaths, child.gameObject));

        return result.ToArray();
    }

    static DeserializedChild[] deserializePrefab(byte[] data, ref int ptr)
    {
        var childCount = (int)data[ptr++];
        var result = new List<DeserializedChild>();

        for (var i = 0; i < childCount; ++i)
            result.Add(deserializeChild(data, ref ptr));

        return result.ToArray();
    }

    static byte[] serializeChild(IList<Mesh> allMeshes, IList<string> prefabPaths, GameObject child)
    {
        bool isPrefab = PrefabUtility.IsAnyPrefabInstanceRoot(child);
        int itemIndex = isPrefab
            ? prefabPaths.IndexOf(PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(child))
            : allMeshes.IndexOf(child.gameObject.GetComponent<MeshFilter>().sharedMesh);

        if (itemIndex >= 64)
        {
            // NOTE If we need more than 64 things, don't include the w sign bit and just include all 4 quaternion components.
            throw new System.Exception("Cannot have more than 64 things.");
        }

        byte isPrefabAndItemIndexAndWSign = (byte)itemIndex;
        isPrefabAndItemIndexAndWSign |= (byte)(isPrefab ? 0b10000000 : 0);
        isPrefabAndItemIndexAndWSign |= (byte)(child.transform.localRotation.w < 0 ? 0b01000000 : 0);

        var result = new List<byte>();

        result.Add(isPrefabAndItemIndexAndWSign);

        result.AddRange(packPrefabVec3(child.transform.localPosition));
        result.AddRange(packPrefabVec3(child.transform.localScale));
        result.AddRange(packPrefabQuat(child.transform.localRotation));

        return result.ToArray();
    }

    class DeserializedChild
    {
        public bool isPrefab;
        public int itemIndex;

        public Vector3 position;
        public Vector3 scale;
        public Quaternion rotation;
    }

    static DeserializedChild deserializeChild(byte[] data, ref int ptr)
    {
        byte isPrefabAndItemIndexAndWSign = data[ptr++];

        float wSign = (isPrefabAndItemIndexAndWSign & 0b01000000) != 0 ? -1.0f : 1.0f;

        var position = unpackPrefabVec3(data, ref ptr);
        var scale = unpackPrefabVec3(data, ref ptr);
        var rotation = unpackPrefabQuat(wSign, data, ref ptr);

        return new DeserializedChild {
            isPrefab = (isPrefabAndItemIndexAndWSign & 0b10000000) != 0,
            itemIndex = isPrefabAndItemIndexAndWSign % 64,

            position = position,
            scale = scale,
            rotation = rotation
        };
    }

    static byte packMeshScaleComponent(float f)
    {
        return (byte)(f * 256.0f / 8.0f);
    }

    static float unpackMeshScaleComponent(byte b)
    {
        return b / 256.0f * 8.0f;
    }

    static byte[] packMeshVec3(Bounds bounds, Vector3 v)
    {
        return new byte[] {
            (byte)(255.0f * (v.x - bounds.min.x) / bounds.size.x),
            (byte)(255.0f * (v.y - bounds.min.y) / bounds.size.y),
            (byte)(255.0f * (v.z - bounds.min.z) / bounds.size.z)
        };
    }

    static Vector3 unpackMeshVec3(Vector3 scale, byte[] data, ref int ptr)
    {
        float x = scale.x * data[ptr++];
        float y = scale.y * data[ptr++];
        float z = scale.z * data[ptr++];

        return new Vector3(x, y, z) / 255.0f;
    }

    static byte[] serializeMesh(Mesh mesh, bool flatShaded, int materialIndex)
    {
        var result = new List<byte>();

        if (mesh.vertices.Length > 256)
        {
            Debug.LogError("Cannot have more than 256 vertices in a mesh!");
            return null;
        }

        if (materialIndex > 127)
        {
            Debug.LogError("Material index cannot be higher than 127!");
            return null;
        }

        byte flatShadedFlagAndMaterialIndex = (byte)(flatShaded ? 128 : 0);
        flatShadedFlagAndMaterialIndex += (byte)materialIndex;

        var originBytes = packMeshVec3(mesh.bounds, Vector3.zero);

        result.AddRange(new byte[] {
            flatShadedFlagAndMaterialIndex,

            packMeshScaleComponent(mesh.bounds.size.x),
            packMeshScaleComponent(mesh.bounds.size.y),
            packMeshScaleComponent(mesh.bounds.size.z),

            originBytes[0],
            originBytes[1],
            originBytes[2],
        });

        result.Add((byte)mesh.vertices.Length);
        result.AddRange(mesh.vertices.SelectMany(v => packMeshVec3(mesh.bounds, v)));

        result.Add((byte)(mesh.triangles.Length / 3));
        result.AddRange(mesh.triangles.Select(t => (byte)t));

        return result.ToArray();
    }

    class DeserializedMesh
    {
        public Mesh mesh;
        public bool flatShaded;
        public int materialIndex;
    }

    static DeserializedMesh deserializeMesh(byte[] data, ref int ptr)
    {
        var result = new DeserializedMesh {
            mesh = new Mesh(),
            flatShaded = false,
            materialIndex = -1
        };

        byte flatShadedFlagAndMaterialIndex = data[ptr++];

        result.flatShaded = flatShadedFlagAndMaterialIndex >= 128;
        result.materialIndex = flatShadedFlagAndMaterialIndex % 128;

        var sx = unpackMeshScaleComponent(data[ptr++]);
        var sy = unpackMeshScaleComponent(data[ptr++]);
        var sz = unpackMeshScaleComponent(data[ptr++]);

        var scale = new Vector3(sx, sy, sz);
        var origin = unpackMeshVec3(scale, data, ref ptr);

        var vertices = new List<Vector3>();

        var numVerts = (int)data[ptr++];
        for (int i = 0; i < numVerts; ++i)
            vertices.Add(unpackMeshVec3(scale, data, ref ptr) - origin);

        var triangles = new List<int>();

        var numTriangles = (int)data[ptr++];
        for (int i = 0; i < numTriangles * 3; ++i)
            triangles.Add((int)data[ptr++]);

        result.mesh.vertices = vertices.ToArray();
        result.mesh.triangles = triangles.ToArray();
        result.mesh.RecalculateBounds();
        result.mesh.RecalculateNormals();
        result.mesh.RecalculateTangents();

        return result;
    }
}
