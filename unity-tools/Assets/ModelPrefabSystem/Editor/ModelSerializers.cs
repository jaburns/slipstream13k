﻿using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEditor;

public class SerializedModelFile
{
    public byte[] data;
    public Material[] materials;
    public Dictionary<string, int> modelIndices;
}

static public class ModelDataFileSerializer
{
    const int MAX_PREFAB_DEPTH = 10;

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

        if (! isPrefab) {
            flatShaded: bit
            materialIndex: 7bit
        }
    }

    struct Mesh
    {
        scale: 3byte
        originX: 3byte

        numVerts: byte
        verts: 3byte[numVerts]

        numTris: byte
        tris: 3byte[numTris]
    }
*/

    class MaterialInfo
    {
        public IList<Material> allMaterials;
        public IList<Material> flatShadedMaterials;
    }

    public static SerializedModelFile Serialize(GameObject topParent, IList<Material> flatShadedMaterials)
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

        var materials = topParent.GetComponentsInChildren<MeshRenderer>()
            .Select(x => x.sharedMaterial)
            .Distinct()
            .ToArray();

        var topLevelObjectPaths = new List<string>();
        foreach (Transform child in topParent.transform)
        {
            if (! PrefabUtility.IsAnyPrefabInstanceRoot(child.gameObject))
                throw new System.Exception("Cannont have non-prefab at root of export object");

            topLevelObjectPaths.Add(PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(child.gameObject));
        }

        var result = new List<byte>();

        result.Add((byte)meshes.Length);

        foreach (var mesh in meshes)
            result.AddRange(serializeMesh(mesh));

        var modelIndices = new Dictionary<string, int>();
        int prefabIndex = 0;

        result.Add((byte)prefabPaths.Length);

        var materialInfo = new MaterialInfo {
            allMaterials = materials,
            flatShadedMaterials = flatShadedMaterials,
        };

        foreach (var path in prefabPaths)
        {
            if (topLevelObjectPaths.Contains(path))
                modelIndices.Add(path.Substring(path.LastIndexOf("/") + 1).Replace(".prefab", ""), prefabIndex);

            result.AddRange(serializePrefab(meshes, prefabPaths, materialInfo, AssetDatabase.LoadAssetAtPath(path, typeof(GameObject)) as GameObject));
            prefabIndex++;
        }

        return new SerializedModelFile {
            data = result.ToArray(),
            materials = materials,
            modelIndices = modelIndices
        };
    }

    public static GameObject Deserialize(SerializedModelFile modelFile, string objectName, IList<int> topLevelObjects)
    {
        int ptr = 0;

        var numMeshes = modelFile.data[ptr++];
        var meshes = new List<Mesh>();

        for (var i = 0; i < numMeshes; ++i)
        {
            var newMesh = deserializeMesh(modelFile.data, ref ptr);
            meshes.Add(newMesh);
        }

        var numPrefabs = modelFile.data[ptr++];
        var prefabs = new List<DeserializedChild[]>();

        var result = new GameObject(objectName);

        for (var i = 0; i < numPrefabs; ++i)
        {
            var newPrefab = deserializePrefab(modelFile.data, ref ptr);
            prefabs.Add(newPrefab);
        }

        var position = Vector3.zero;
        foreach (var topLevelIndex in topLevelObjects)
        {
            var newObj = instantiatePrefab(meshes, prefabs, topLevelIndex, modelFile.materials, 0);
            newObj.transform.parent = result.transform;
            newObj.transform.localPosition = position;
            position += Vector3.right * 2;
        }

        return result;
    }

    static GameObject instantiatePrefab(IList<Mesh> meshes, IList<DeserializedChild[]> prefabs, int prefabIndex, Material[] materials, int depth)
    {
        var result = new GameObject("PrefabObject");
        var prefab = prefabs[prefabIndex];

        if (depth > MAX_PREFAB_DEPTH) return result;

        foreach (var child in prefab)
        {
            var childObject = child.isPrefab
                ? instantiatePrefab(meshes, prefabs, child.itemIndex, materials, depth + 1)
                : instantiateMeshObject(meshes[child.itemIndex], materials, child.flatShaded, child.materialIndex);

            childObject.transform.parent = result.transform;
            childObject.transform.localPosition = child.position;
            childObject.transform.localRotation = child.rotation;
            childObject.transform.localScale = child.scale;
        }

        return result;
    }

    static GameObject instantiateMeshObject(Mesh mesh, Material[] materials, bool flatShaded, int materialIndex)
    {
        var result = new GameObject("MeshObject");
        result.AddComponent<MeshFilter>().sharedMesh = flatShaded ? createFlatShadedMesh(mesh) : mesh;
        result.AddComponent<MeshRenderer>().sharedMaterial = materials[materialIndex];
        return result;
    }

    static Mesh createFlatShadedMesh(Mesh source)
    {
        var verts = new List<Vector3>();
        var tris = new List<int>();

        for (var i = 0; i < source.triangles.Length - 2; i += 3)
        {
            verts.Add(source.vertices[source.triangles[i+0]]);
            verts.Add(source.vertices[source.triangles[i+1]]);
            verts.Add(source.vertices[source.triangles[i+2]]);

            tris.Add(i+0);
            tris.Add(i+1);
            tris.Add(i+2);
        }
        
        var result = new Mesh();
        result.vertices = verts.ToArray();
        result.triangles = tris.ToArray();
        result.RecalculateBounds();
        result.RecalculateNormals();
        result.RecalculateTangents();
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

    static byte[] serializePrefab(IList<Mesh> allMeshes, IList<string> prefabPaths, MaterialInfo materialInfo, GameObject prefab)
    {
        var result = new List<byte>();

        result.Add((byte)prefab.transform.childCount);

        foreach (Transform child in prefab.transform)
            result.AddRange(serializeChild(allMeshes, prefabPaths, materialInfo, child.gameObject));

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

    static byte[] serializeChild(IList<Mesh> allMeshes, IList<string> prefabPaths, MaterialInfo materialInfo, GameObject child)
    {
        bool isPrefab;
        int itemIndex;

        var recursivePrefabComponent = child.GetComponent<RecursivePrefab>();

        if (recursivePrefabComponent != null)
        {
            isPrefab = true;
            itemIndex = prefabPaths.IndexOf(PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(recursivePrefabComponent.prefab));
        }
        else
        {
            isPrefab = PrefabUtility.IsAnyPrefabInstanceRoot(child);
            itemIndex = isPrefab
                ? prefabPaths.IndexOf(PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(child))
                : allMeshes.IndexOf(child.gameObject.GetComponent<MeshFilter>().sharedMesh);
        }

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

        if (! isPrefab)
        {
            var material = child.gameObject.GetComponent<MeshRenderer>().sharedMaterial;
            byte flatShadedAndMaterialIndex = (byte)materialInfo.allMaterials.IndexOf(material);
            flatShadedAndMaterialIndex |= (byte)(materialInfo.flatShadedMaterials.IndexOf(material) >= 0 ? 0b10000000 : 0);
            result.Add(flatShadedAndMaterialIndex);
        }

        return result.ToArray();
    }

    class DeserializedChild
    {
        public bool isPrefab;
        public int itemIndex;

        public bool flatShaded;
        public int materialIndex;

        public Vector3 position;
        public Vector3 scale;
        public Quaternion rotation;
    }

    static DeserializedChild deserializeChild(byte[] data, ref int ptr)
    {
        byte isPrefabAndItemIndexAndWSign = data[ptr++];
        bool isPrefab = (isPrefabAndItemIndexAndWSign & 0b10000000) != 0;
        float wSign   = (isPrefabAndItemIndexAndWSign & 0b01000000) != 0 ? -1.0f : 1.0f;
        int itemIndex = isPrefabAndItemIndexAndWSign % 64;

        bool flatShaded = false;
        int materialIndex = 0;

        var position = unpackPrefabVec3(data, ref ptr);
        var scale = unpackPrefabVec3(data, ref ptr);
        var rotation = unpackPrefabQuat(wSign, data, ref ptr);

        if (! isPrefab)
        {
            byte flatShadedAndMaterialIndex = data[ptr++];
            flatShaded = (flatShadedAndMaterialIndex & 0b10000000) != 0;
            materialIndex = flatShadedAndMaterialIndex % 128;
        }

        return new DeserializedChild {
            isPrefab = isPrefab,
            itemIndex = itemIndex,

            flatShaded = flatShaded,
            materialIndex = materialIndex,

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

    static byte[] serializeMesh(Mesh mesh)
    {
        var result = new List<byte>();

        if (mesh.vertices.Length > 256)
        {
            Debug.LogError("Cannot have more than 256 vertices in a mesh!");
            return null;
        }

        var originBytes = packMeshVec3(mesh.bounds, Vector3.zero);

        result.AddRange(new byte[] {
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

    static Mesh deserializeMesh(byte[] data, ref int ptr)
    {
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

        var result = new Mesh();

        result.vertices = vertices.ToArray();
        result.triangles = triangles.ToArray();
        result.RecalculateBounds();
        result.RecalculateNormals();
        result.RecalculateTangents();

        return result;
    }
}
