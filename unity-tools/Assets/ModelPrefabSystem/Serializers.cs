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
        isPrefab: bit  // if not set then this child is a mesh
        itemIndex: 7bit

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
    static byte[] packPrefabVec3(Vector3 f)
    {
        return new byte[] {
            (byte)((f.x + 2.0f) * 256.0f / 2.0f),
            (byte)((f.y + 2.0f) * 256.0f / 2.0f),
            (byte)((f.z + 2.0f) * 256.0f / 2.0f)
        };
    }

    static byte[] packPrefabQuat(Quaternion f)
    {
        return packPrefabVec3(new Vector3(f.x, f.y, f.z));
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
        return null;
    }

    static byte[] serializePrefab(IList<Mesh> allMeshes, IList<string> prefabPaths, GameObject prefab)
    {
        var result = new List<byte>();

        result.Add((byte)prefab.transform.childCount);

        foreach (Transform child in prefab.transform)
            result.AddRange(serializeChild(allMeshes, prefabPaths, child.gameObject));

        return result.ToArray();
    }

    static GameObject deserializePrefab(byte[] data)
    {
        return null;
    }

    static byte[] serializeChild(IList<Mesh> allMeshes, IList<string> prefabPaths, GameObject child)
    {
        bool isPrefab = PrefabUtility.IsAnyPrefabInstanceRoot(child);
        int itemIndex = isPrefab
            ? prefabPaths.IndexOf(PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(child))
            : allMeshes.IndexOf(child.gameObject.GetComponent<MeshFilter>().sharedMesh);

        byte isPrefabAndItemIndex = (byte)(isPrefab ? 128 : 0);
        isPrefabAndItemIndex += (byte)itemIndex;

        var result = new List<byte>();

        result.Add(isPrefabAndItemIndex);

        result.AddRange(packPrefabVec3(child.transform.localPosition));
        result.AddRange(packPrefabVec3(child.transform.localScale));
        result.AddRange(packPrefabQuat(child.transform.localRotation));

        return result.ToArray();
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

    static DeserializedMesh deserializeMesh(byte[] data)
    {
        return null;
    }
}
