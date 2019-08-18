using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using System.IO;

[ExecuteInEditMode]
public class ExportModelFile : MonoBehaviour
{
    public bool exportAs8File = false;
    public bool exportAs16File = false;

    void Update()
    {
        if (exportAs8File)
        {
            exportAs8File = false;
            doRun(false);
        }
        else if(exportAs16File) 
        {
            exportAs16File = false;
            doRun(true);
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

    void doRun(bool mode16)
    {
        var result = new List<byte>();

        var mesh = GetMesh();

        if (mode16)
        {
            if (mesh.vertices.Length > 0x10000)
            {
                Debug.LogError("Cannot have more than " + 0x10000 + " vertices in a .16 file");
                return;
            }
        }
        else
        {
            if (mesh.vertices.Length > 0x100)
            {
                Debug.LogError("Cannot have more than " + 0x100 + " vertices in a .8 file");
                return;
            }
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

        if (mode16) 
            result.AddRange(mesh.triangles.SelectMany(t => new byte[] { (byte)(t % 256), (byte)(t / 256) }));
        else 
            result.AddRange(mesh.triangles.Select(t => (byte)t));

        File.WriteAllBytes(Application.dataPath + "/exported." + (mode16 ? "16" : "8"), result.ToArray());
    }
}

