using UnityEngine;
using UnityEditor;
using System.Collections.Generic;
using System;
using System.IO;

[CustomEditor(typeof(HeightMapNodes))]
public class HeightMapNodesEditor : Editor
{
    const string MAP_OUTPUT_FILE = "/../../blobs/01_map.blob";

    HeightMapNodes targ { get { return target as HeightMapNodes; } }

    int lastChangeIndex = -1;

    public override void OnInspectorGUI()
    {
        if (GUILayout.Button("Burn Map"))
        {
            var ser = targ.Serialize();
            targ.Deserialize(ser);

            var lineMap = burnLines(bakeTargetMapToLines(), targ.mapResolution);
            var sdf = ComputeSignedDistance.Run(lineMap);

            targ.GetComponent<MeshRenderer>().sharedMaterial.SetTexture("_MainTex", sdf);

            File.WriteAllBytes(Application.dataPath + MAP_OUTPUT_FILE, ser);
        }

        base.OnInspectorGUI();
    }

    void OnSceneGUI()
    {
        if (targ.chunks.Count < 1)
            targ.chunks.Add(new HeightMapNodes.Chunk());

        if (lastChangeIndex >= 0)
        {
            Handles.BeginGUI();

            if (GUILayout.Button("Insert", GUILayout.Width(100)))
                targ.chunks.Insert(lastChangeIndex, targ.chunks[lastChangeIndex].CloneAndOffset());

            if (GUILayout.Button("Delete", GUILayout.Width(100)))
                targ.chunks.RemoveAt(lastChangeIndex);

            Handles.EndGUI();
        }

        for (int i = 0; i < targ.chunks.Count; ++i)
        {
            bool handleChange = false;

            EditorGUI.BeginChangeCheck();
                targ.chunks[i].start = Handles.PositionHandle(targ.chunks[i].start, Quaternion.identity);
            handleChange |= EditorGUI.EndChangeCheck();

            EditorGUI.BeginChangeCheck();
                targ.chunks[i].handleIn  = (Vector2)Handles.PositionHandle(targ.chunks[i].handleIn  + targ.chunks[i].start, Quaternion.identity) - targ.chunks[i].start;
            if (EditorGUI.EndChangeCheck()) {
                handleChange = true;
                realignHandle(targ.chunks[i], false);
            }

            EditorGUI.BeginChangeCheck();
                targ.chunks[i].handleOut = (Vector2)Handles.PositionHandle(targ.chunks[i].handleOut + targ.chunks[i].start, Quaternion.identity) - targ.chunks[i].start;
            if (EditorGUI.EndChangeCheck()) {
                handleChange = true;
                realignHandle(targ.chunks[i], true);
            }

            if (handleChange)
                lastChangeIndex = i;

            Handles.color = Color.red;
            Handles.DrawLine(targ.chunks[i].start, targ.chunks[i].start + targ.chunks[i].handleIn);
            Handles.DrawLine(targ.chunks[i].start, targ.chunks[i].start + targ.chunks[i].handleOut);

            Handles.color = Color.green;
            Handles.DrawSolidDisc(targ.chunks[i].start, Vector3.back, 0.1f);

            var j = (i + 1) % targ.chunks.Count;

            float step = 0.01f;
            for (float t = 0f; t < 1f - .5f*step; t += step)
            {
                float u = t + step;

                var a = bezier(
                    targ.chunks[i].start,
                    targ.chunks[i].start + targ.chunks[i].handleOut,
                    targ.chunks[j].start + targ.chunks[j].handleIn, 
                    targ.chunks[j].start,
                    t
                );

                var b = bezier(
                    targ.chunks[i].start,
                    targ.chunks[i].start + targ.chunks[i].handleOut,
                    targ.chunks[j].start + targ.chunks[j].handleIn, 
                    targ.chunks[j].start,
                    u
                );

                Handles.DrawLine(a, b);
            }
        }
    }

    Vector2[] bakeTargetMapToLines()
    {
        var result = new List<Vector2>();

        for (int i = 0; i < targ.chunks.Count; ++i)
        {
            int j = (i + 1) % targ.chunks.Count;

            float step = 0.01f;
            for (float t = 0f; t < 1f; t += step)
            {
                result.Add(bezier(
                    targ.chunks[i].start,
                    targ.chunks[i].start + targ.chunks[i].handleOut,
                    targ.chunks[j].start + targ.chunks[j].handleIn, 
                    targ.chunks[j].start,
                    t
                ));
            }
        }

        return result.ToArray();
    }

    static Vector2 bezier(Vector2 start, Vector2 a, Vector2 b, Vector2 end, float t)
    {
        var u = 1f - t;
        return u*u*u*start + 3*u*u*t*a + 3*u*t*t*b + t*t*t*end;
    }

    static void realignHandle(HeightMapNodes.Chunk chunk, bool changedOutHandle)
    {
        var changedHandle = changedOutHandle ? chunk.handleOut : chunk.handleIn;
        var otherHandle = changedOutHandle ? chunk.handleIn : chunk.handleOut;

        var magnitude = otherHandle.magnitude;
        var theta = Mathf.Atan2(changedHandle.y, changedHandle.x) + Mathf.PI;

        otherHandle.x = Mathf.Cos(theta) * magnitude;
        otherHandle.y = Mathf.Sin(theta) * magnitude;

        if (changedOutHandle) chunk.handleIn = otherHandle;
        else chunk.handleOut = otherHandle;
    }

    static Texture2D burnLines(Vector2[] lines, int mapSize)
    {
        Texture2D result = new Texture2D(mapSize, mapSize);
        var pixels = new Color[mapSize * mapSize];

        float stepSize = 10f / mapSize;

        for (int ix = 0; ix < mapSize; ++ix)
        for (int iy = 0; iy < mapSize; ++iy)
        {
            pixels[ix+iy*mapSize] = Color.white;
        }

        for (int i = 0; i < lines.Length; ++i)
        {
            int j = (i + 1) % lines.Length;

            var a = lines[i];
            var b = lines[j];

            var stepCount = Mathf.CeilToInt((b - a).magnitude / stepSize);
            var step = (b - a).normalized * stepSize;
            var pos = a;

            for (int s = 0; s < stepCount; ++s)
            {
                pos += step;

                int ix = (int)(mapSize * (pos.x / 10f));
                int iy = (int)(mapSize * (pos.y / 10f));

                pixels[ix+iy*mapSize] = Color.black;
            }
        }

        result.SetPixels(pixels);
        result.Apply();
        return result;
    }
}
