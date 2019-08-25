using UnityEngine;
using System.Collections.Generic;
using System;
using System.IO;

[ExecuteInEditMode]
public class TerrainGen : MonoBehaviour
{
#pragma warning disable 0649

    [SerializeField] Texture2D map;
    [SerializeField] bool run;

#pragma warning restore 0649

    void Update()
    {
        if (run)
        {
            run = false;
            doRun();
        }
    }

    Mesh flatMesh;

    void doRun()
    {
        GetComponent<MeshFilter>().sharedMesh = GetTerrainMesh(map);

        //var outTex = FindCutoffs(map);
        var diff = Differentiate(map);

        File.WriteAllBytes(Application.dataPath + "/out.png", ImageConversion.EncodeToPNG(diff));
    }

    static Texture2D Differentiate(Texture2D tex)
    {
        var result = new Texture2D(tex.width, tex.height);
        var pixIn = tex.GetPixels();
        var pixOut = new Color[pixIn.Length];

        for (var x = 3; x < tex.width; x++)
        {
            for (var y = 3; y < tex.height; y++)
            {
                var above3 = pixIn[x + (y-3)*tex.height];
                var above2 = pixIn[x + (y-2)*tex.height];
                var above1 = pixIn[x + (y-1)*tex.height];

                var left3 = pixIn[x-3 + y*tex.height];
                var left2 = pixIn[x-2 + y*tex.height];
                var left1 = pixIn[x-1 + y*tex.height];

                var here  = pixIn[x + y*tex.height];

                var dx3 = here.r - left3.r;
                var dx2 = here.r - left2.r;
                var dx1 = here.r - left1.r;

                var dy3 = here.r - above3.r;
                var dy2 = here.r - above2.r;
                var dy1 = here.r - above1.r;

                var dx = (dx1 + dx2 + dx3) / 3;
                var dy = (dy1 + dy2 + dy3) / 3;

                var d = new Vector2(dx, dy).normalized;

                pixOut[x + y*tex.height] = new Color(0.5f + 0.5f*d.x, 0.5f + 0.5f*d.y, 1, 1);
            }
        }

        result.SetPixels(pixOut);
        return result;
    }

    /*
    static Color AverageColor(params Color[] colors)
    {
        var result = new Vector4(0, 0, 0, 0);

        for (var i = 0; i < colors.Length; ++i)
            result += new Vector4(colors[i].r, colors[i].g, colors[i].b, colors[i].a);

        result /= colors.Length;

        return new Color(result.x, result.y, result.z, result.w);
    }

    static Texture2D Blur(Texture2D tex)
    {
        var result = new Texture2D(tex.width, tex.height);
        var pixIn = tex.GetPixels();
        var pixOut = new Color[pixIn.Length];

        for (var x = 2; x < tex.width - 2; x++)
        {
            for (var y = 2; y < tex.height - 2; y++)
            {
                var above = pixIn[x + (y-1)*tex.height];
                var left  = pixIn[x-1 + y*tex.height];
                var here  = pixIn[x + y*tex.height];

                var dx = here.r - left.r;
                var dy = here.r - above.r;

                pixOut[x + y*tex.height] = 4.0f * AverageColor(
                    0.23f * pixIn[(x+0) + (y-0)*tex.height],

                    0.19f * pixIn[(x+0) + (y-1)*tex.height],
                    0.19f * pixIn[(x+0) + (y+1)*tex.height],
                    0.12f * pixIn[(x+0) + (y-2)*tex.height],
                    0.12f * pixIn[(x+0) + (y+2)*tex.height],

                    0.19f * pixIn[(x-1) + (y+0)*tex.height],
                    0.19f * pixIn[(x+1) + (y+0)*tex.height],
                    0.12f * pixIn[(x-2) + (y+0)*tex.height],
                    0.12f * pixIn[(x+2) + (y+0)*tex.height]
                );
            }
        }

        result.SetPixels(pixOut);
        return result;
    }
    */
     
    static Texture2D FindCutoffs(Texture2D heightMap)
    {
        var result = new Texture2D(heightMap.width, heightMap.height);
        var pix = heightMap.GetPixels32();

        for (var x = 0; x < heightMap.width; x++)
        {
            for (var y = 0; y < heightMap.height; y++)
            {
                var px = pix[x + y*heightMap.width];

                if (px.r >= 115 && px.r <= 140)
                    px = new Color32(0, 255, 0, 255);

                pix[x + y*heightMap.width] = px;
            }
        }

        for (var x = 0; x < heightMap.width; x++)
        {
            for (var y = 0; y < heightMap.height; y++)
            {
                var px = pix[x + y*heightMap.width];

                if (px.r == 0 && px.g == 255)
                {
                    Debug.LogFormat("{0} {1}", x, y);
                    FloodFill.Run(pix, heightMap.width, heightMap.height, x, y, new Color32(0, 0, 255, 255));
                }
            }
        }

        result.SetPixels32(pix);
        return result;
    }

    static Mesh GetTerrainMesh(Texture2D heightMap)
    {
        var pixels = heightMap.GetPixels();

        Func<float, float, float> getHeight = (x, y) =>
            pixels[(int)(x * heightMap.width) + (int)(y * heightMap.height) * heightMap.width].r;

        const int W = 200;
        const int H = 200;

        var vertices = new List<Vector3>();

        for (var x = 0; x < W; x++)
        {
            for (var y = 0; y < H; y++)
            {
                var h = getHeight((float)x / W, (float)y / H);
                if (h > 0.5f) h = 0.5f; // + 5.0f * (h - 0.5f);

                vertices.Add(new Vector3(x * 0.5f, 5f * h, y * 0.5f));
            }
        }

        var triangles = new List<int>();

        for (var x = 0; x < W - 1; x++)
        {
            for (var y = 0; y < H - 1; y++)
            {
                triangles.Add(x + y*W);
                triangles.Add((x+1) + y*W);
                triangles.Add(x + (y+1)*W);

                triangles.Add(x + (y+1)*W);
                triangles.Add((x+1) + y*W);
                triangles.Add((x+1) + (y+1)*W);
            }
        }

        var mesh = new Mesh();
        mesh.vertices = vertices.ToArray();
        mesh.triangles = triangles.ToArray();
        mesh.RecalculateBounds();
        mesh.RecalculateNormals();
        mesh.RecalculateTangents();
        return mesh;
    }
}
