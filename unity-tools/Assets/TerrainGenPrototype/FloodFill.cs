using UnityEngine;
using System.Collections.Generic;

static public class FloodFill
{
    struct Args
    {
        public int x, y;
    }

    static public void Run(Color32[] pixels, int width, int height, int x, int y, Color32 color)
    {
        var ogColor = pixels[x + y*width];

        var stack = new Stack<Args>();
        stack.Push(new Args { x = x, y = y });

        while (stack.Count > 0)
        {
            var args = stack.Pop();

            var a = pixels[args.x + args.y*width];

            if (a.r == color.r && a.g == color.g && a.b == color.b && a.a == color.a) continue;
            if (a.r != ogColor.r || a.g != ogColor.g || a.b != ogColor.b || a.a != ogColor.a) continue;

            pixels[args.x + args.y*width] = color;

            if (args.x > 0)          stack.Push(new Args { x = args.x - 1, y = args.y });
            if (args.y > 0)          stack.Push(new Args { x = args.x, y = args.y - 1 });
            if (args.x < width - 1)  stack.Push(new Args { x = args.x + 1, y = args.y });
            if (args.y < height - 1) stack.Push(new Args { x = args.x, y = args.y + 1 });
        }
    }
}
