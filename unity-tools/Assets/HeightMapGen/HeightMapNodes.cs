using System.Collections.Generic;
using UnityEngine;
using System;

public class HeightMapNodes : MonoBehaviour
{
    [Serializable]
    public class Chunk
    {
        public Vector2 start = Vector2.one;
        public Vector2 handleIn = Vector2.one; // relative to start
        public Vector2 handleOut = -Vector2.one; // relative to start

        public Chunk CloneAndOffset()
        {
            return new Chunk {
                start = start + Vector2.one,
                handleIn = handleIn,
                handleOut = handleOut
            };
        }
    }

    public List<Chunk> chunks = new List<Chunk>();
    public int mapResolution = 256;

    byte[] serializeVec2(Vector2 v)
    {
        return new byte[] { 
            (byte)(255 * v.x / 10),
            (byte)(255 * v.y / 10)
        };
    }

    public byte[] Serialize()
    {
        var bytes = new List<byte>();

        for (int i = 0; i < chunks.Count; ++i)
        {
            var j = (i + 1) % chunks.Count;

            bytes.AddRange(serializeVec2(chunks[i].start));
            bytes.AddRange(serializeVec2(chunks[i].handleOut + chunks[i].start));
            bytes.AddRange(serializeVec2(chunks[j].handleIn + chunks[j].start));
        }

        return bytes.ToArray();
    }

    Vector2 deserializeVec2(byte[] data, int ptr)
    {
        return new Vector2(data[ptr], data[ptr+1]) / 255.0f * 10.0f;
    }

    public void Deserialize(byte[] bytes)
    {
        chunks = new List<Chunk>();

        for (int i = 0; i < bytes.Length / 6; ++i)
            chunks.Add(new Chunk());

        for (int i = 0; i < chunks.Count; ++i)
        {
            chunks[i].start = deserializeVec2(bytes, 6*i);
            chunks[i].handleOut = deserializeVec2(bytes, 6*i + 2);
            chunks[(i + 1) % chunks.Count].handleIn = deserializeVec2(bytes, 6*i + 4);
        }

        foreach (var chunk in chunks)
        {
            chunk.handleIn -= chunk.start;
            chunk.handleOut -= chunk.start;
        }
    }
}
