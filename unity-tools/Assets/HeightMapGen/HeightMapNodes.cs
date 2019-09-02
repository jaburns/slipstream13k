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

    byte[] serializeStart(Vector2 v)
    {
        return new byte[] { 
            (byte)(255 * v.x / 10),
            (byte)(255 * v.y / 10)
        };
    }

    byte[] serializeHandle(Vector2 v)
    {
        return new byte[] { 
            (byte)(255 * (v.x + 5) / 10),
            (byte)(255 * (v.y + 5) / 10)
        };
    }

    public byte[] Serialize()
    {
        var bytes = new List<byte>();

        foreach (var chunk in chunks)
        {
            bytes.AddRange(serializeStart(chunk.start));
            bytes.AddRange(serializeHandle(chunk.handleIn));
            bytes.AddRange(serializeHandle(chunk.handleOut));
        }

        return bytes.ToArray();
    }

    Vector2 deserializeStart(byte[] data, int ptr)
    {
        return new Vector2(data[ptr], data[ptr+1]) / 255.0f * 10.0f;
    }

    Vector2 deserializeHandle(byte[] data, int ptr)
    {
        return new Vector2(data[ptr], data[ptr+1]) / 255.0f * 10.0f - 5.0f * Vector2.one;
    }

    public void Deserialize(byte[] bytes)
    {
        chunks = new List<Chunk>();

        for (int i = 0; i < bytes.Length; i += 6)
        {
            chunks.Add(new Chunk {
                start = deserializeStart(bytes, i),
                handleIn = deserializeHandle(bytes, i+2),
                handleOut = deserializeHandle(bytes, i+4)
            });
        }
    }
}
