using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using System.IO;

/*
Scale byte:
    1 bit sign
    1 bit above decimal
    6 bits below decimal

Rotation byte:
    1 bit sign
    7 bits below decimal

Position byte:
    1 bit sign
    3 bit above decimal
    4 bits below decimal

struct Model
{
    flatShaded: bit
    materialIndex: 7bit

    scale: 3byte
    originX: 3byte

    numVerts: byte

    verts: 3byte[numVerts]
    tris: byte[]
}

struct Prefab
{
    modelOrPrefab: bit
    itemIndex: 7bit

    scale: 3byte
    pos: 3byte
    rotation: 3byte
}

struct ModelDataFile
{
    numModels: byte
    numPrefabs: byte
    
    models: Model[numModels]
    prefabs: Prefab[numPrefabs]
}
*/

[ExecuteInEditMode]
public class ExportModelFile : MonoBehaviour
{
    public bool export = false;

    void Update()
    {
        if (export)
        {
            export = false;
            doRun();
        }
    }

    static byte packScale(float f)
    {
        return (byte)(f * 256.0f / 8.0f);
    }

    static float unpackScale(byte b)
    {
        return b / 256.0f * 8.0f;
    }

    static byte[] packVec3(Bounds bounds, Vector3 v)
    {
        return new byte[] {
            (byte)(255.0f * (v.x - bounds.min.x) / bounds.size.x),
            (byte)(255.0f * (v.y - bounds.min.y) / bounds.size.y),
            (byte)(255.0f * (v.z - bounds.min.z) / bounds.size.z)
        };
    }

    Mesh GetMesh()
    {
        var mf  = GetComponent<MeshFilter>();
        return mf.sharedMesh;
    }

    void doRun()
    {
        var result = new List<byte>();

        var mesh = GetMesh();

        if (mesh.vertices.Length > 0x100)
        {
            Debug.LogError("Cannot have more than " + 0x100 + " vertices in a mesh!");
            return;
        }

        var originBytes = packVec3(mesh.bounds, Vector3.zero);

        result.AddRange(new byte[] {
            packScale(mesh.bounds.size.x * transform.localScale.x),
            packScale(mesh.bounds.size.y * transform.localScale.y),
            packScale(mesh.bounds.size.z * transform.localScale.z),

            originBytes[0],
            originBytes[1],
            originBytes[2],

            (byte)(mesh.vertices.Length % 256),
            (byte)(mesh.vertices.Length / 256)
        });

        result.AddRange(mesh.vertices.SelectMany(v => packVec3(mesh.bounds, v)));

        result.AddRange(mesh.triangles.Select(t => (byte)t));

        File.WriteAllBytes(Application.dataPath + "/exported.models", result.ToArray());
    }
}

