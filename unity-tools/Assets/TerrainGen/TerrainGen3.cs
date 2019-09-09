using System.Collections.Generic;
using UnityEngine;

[ExecuteInEditMode]
public class TerrainGen3 : MonoBehaviour
{
#pragma warning disable 0649 // Field read from but never written to warning.

    [SerializeField] Texture2D heightMap;
    [SerializeField] Texture2D normalMap;
    [SerializeField] Texture2D secondaryHeightMap;
    [SerializeField] Material material;

    [SerializeField] float secondaryHeightMapScale;
    [SerializeField] bool useUnityNormals;
    [SerializeField] int verticesPerChunkSide; // 2 - 256
    [SerializeField] int chunksPerMapSide;
    [SerializeField] float worldSpaceMapSize;

    [SerializeField] bool run;

#pragma warning restore 0649

    void Start()
    {
        doRun();
    }

    void Update()
    {
        if (run) { run = false; doRun(); }
    }

    void doRun()
    {
        deleteAllChildChunks();

        for (int x = 0; x < chunksPerMapSide; ++x)
        for (int z = 0; z < chunksPerMapSide; ++z)
            createChunk(x, z);
    }

    void deleteAllChildChunks()
    {
        var deleteList = new List<GameObject>();

        foreach (var chunk  in FindObjectsOfType<GameObject>())
        {
            if (chunk.name != "Chunk") continue;
            if (chunk.transform.parent != transform) continue;
            deleteList.Add(chunk);
        }

        for (int i = 0; i < deleteList.Count; ++i)
            DestroyImmediate(deleteList[i]);
    }

    GameObject createChunk(int chunkX, int chunkZ)
    {
        var go = new GameObject("Chunk");
        var mf = go.AddComponent<MeshFilter>();
        var mr = go.AddComponent<MeshRenderer>();

        mr.sharedMaterial = material;
        mf.sharedMesh = createChunkMesh(chunkX, chunkZ);

        go.hideFlags = HideFlags.DontSaveInEditor;
        go.transform.parent = transform;
        go.transform.localPosition = Vector3.zero;
        go.transform.localRotation = Quaternion.identity;
        go.transform.localScale = Vector3.one;

        return go;
    }

    Vector3 getNormalFromLookupColor(Color color)
    {
        return new Vector3(-(color.r*2f-1f), 1f, color.g*2f-1f).normalized;
    }

    Mesh createChunkMesh(int chunkX, int chunkZ)
    {
        var vertices = new List<Vector3>();
        var normals = new List<Vector3>();
        var uvs = new List<Vector2>();

        var chunkUV = new Vector2(chunkX, chunkZ) / chunksPerMapSide;

        for (int vx = 0; vx < verticesPerChunkSide; vx++) 
        for (int vz = 0; vz < verticesPerChunkSide; vz++) 
        {
            var uv = chunkUV + new Vector2(vx, vz) / (verticesPerChunkSide - 1) / chunksPerMapSide;

            var heightMapLookup = heightMap.GetPixelBilinear(uv.x, uv.y).r;
            var secondHeightMapLookup = secondaryHeightMap.GetPixelBilinear(uv.x, uv.y).r;

            vertices.Add(new Vector3(
                uv.x * worldSpaceMapSize,
                heightMapLookup + secondaryHeightMapScale * secondHeightMapLookup,
                uv.y * worldSpaceMapSize
            ));

            var normal = getNormalFromLookupColor(normalMap.GetPixelBilinear(uv.x, uv.y));

            normals.Add(normal);

            uvs.Add(uv);
        }

        var triangles = new List<int>();

        for (var x = 0; x < verticesPerChunkSide - 1; x++)
        {
            for (var y = 0; y < verticesPerChunkSide - 1; y++)
            {
                triangles.Add(x + y*verticesPerChunkSide);
                triangles.Add((x+1) + y*verticesPerChunkSide);
                triangles.Add(x + (y+1)*verticesPerChunkSide);

                triangles.Add(x + (y+1)*verticesPerChunkSide);
                triangles.Add((x+1) + y*verticesPerChunkSide);
                triangles.Add((x+1) + (y+1)*verticesPerChunkSide);
            }
        }

        var mesh = new Mesh();
        mesh.vertices = vertices.ToArray();
        mesh.triangles = triangles.ToArray();
        mesh.uv = uvs.ToArray();

        if (useUnityNormals)
            mesh.RecalculateNormals();
        else
            mesh.normals = normals.ToArray();

        mesh.RecalculateBounds();
        mesh.RecalculateTangents();
        return mesh;
    }
}
