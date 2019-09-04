using System;
using System.Collections.Generic;
using UnityEngine;

static public class ComputeSignedDistance
{
    struct Candidate
    {
        public Vector2 pos;
        public float sqrDist;
    }
    
    static float findEdgeDistance(Color[] data, int width, int x, int y)
    {
        var candidates = new List<Candidate>();

        Func<int, int, bool> test = (ix, iy) => {
            if (ix < 0 || ix >= width || iy < 0 || iy >= width) return false;
            return data[ix+iy*width].r < 0.5f;
        };

        int maxRadius = 128;

        Action<int, int, int> pushTest = (ix, iy, radius) => {
            if (! test(ix, iy)) return;
            if (candidates.Count < 1) maxRadius = 2*radius;
            var pos = new Vector2(ix, iy);
            candidates.Add(new Candidate {
                pos = pos,
                sqrDist = (pos - new Vector2(x, y)).sqrMagnitude
            });
        };

        for (int radius = 0; radius < maxRadius; ++radius)
        for (int o = -radius; o <= radius; ++o)
        {
            pushTest(x + o, y - radius, radius);
            pushTest(x + o, y + radius, radius);
            pushTest(x - radius, y + o, radius);
            pushTest(x + radius, y + o, radius);
        }

        if (candidates.Count == 0) return 128f;

        candidates.Sort((a, b) => (int)Mathf.Sign(a.sqrDist - b.sqrDist));
        return Mathf.Sqrt(candidates[0].sqrDist);
    }

    public static Texture2D Run(Texture2D input)
    {
        var outPx = new Color[input.width * input.height];
        var inPx = input.GetPixels();

        for (int ix = 0; ix < input.width; ++ix)
        for (int iy = 0; iy < input.height; ++iy)
        {
            var dist = findEdgeDistance(inPx, input.width, ix, iy);
            var color = Mathf.Clamp01(dist / 16f);

            outPx[ix+iy*input.width] = new Color(color, color, color, 1);
        }

        var result = new Texture2D(input.width, input.height);
        result.SetPixels(outPx);
        result.Apply();
        return result;
    }
}
