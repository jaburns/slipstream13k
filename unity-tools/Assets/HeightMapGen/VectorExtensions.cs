using UnityEngine;

static public class Vector2Ext
{
    static readonly float COS45 = Mathf.Cos(Mathf.PI / 4f);
    static readonly float SIN45 = Mathf.Sin(Mathf.PI / 4f);

    static public Vector2 WithX(this Vector2 v, float x) { return new Vector2(x, v.y); }
    static public Vector2 WithY(this Vector2 v, float y) { return new Vector2(v.x, y); }

    static public Vector3 AsVector3WithX(this Vector2 v, float x) { return new Vector3(x, v.x, v.y); }
    static public Vector3 AsVector3WithY(this Vector2 v, float y) { return new Vector3(v.x, y, v.y); }
    static public Vector3 AsVector3WithZ(this Vector2 v, float z) { return new Vector3(v.x, v.y, z); }

    static public Vector2 Mul(this Vector2 v,Vector2 o) { return new Vector2(v.x * o.x, v.y * o.y); }
    static public Vector2 Mul(this Vector2 v, float x, float y) { return new Vector2(v.x * x, v.y * y); }

    static public Vector2 Div(this Vector2 v,Vector2 o) { return new Vector2(v.x / o.x, v.y / o.y); }
    static public Vector2 Div(this Vector2 v, float x, float y) { return new Vector2(v.x / x, v.y / y); }

    static public Vector2 Rotated(this Vector2 v, float degrees) { return Quaternion.Euler(0, 0, degrees) * v; }
    static public Vector2 Rotated90(this Vector2 vec) { return new Vector2 (-vec.y, vec.x); }
    static public Vector2 RotatedBack90(this Vector2 vec) { return new Vector2 (vec.y, -vec.x); }
    static public Vector2 Rotated45(this Vector2 vec) { return new Vector2 (vec.x * COS45 - vec.y * SIN45, vec.x * SIN45 + vec.y * COS45); }
    static public Vector2 RotatedBack45(this Vector2 vec) { return new Vector2 (-vec.x * COS45 + vec.y * SIN45, -vec.x * SIN45 - vec.y * COS45); }

    static public Vector2 FromPolar(float radius, float radians)
    {
        return new Vector2(
            radius * Mathf.Cos(radians),
            radius * Mathf.Sin(radians)
        );
    }

    static public float Dot(this Vector2 v, Vector2 v1)
    {
        return v.x*v1.x + v.y*v1.y;
    }

    static public float Cross(this Vector2 v, Vector2 v1)
    {
        return v.x*v1.y - v.y*v1.x;
    }

    static public Vector2 ComponentProduct(this Vector2 v, Vector2 v1)
    {
        return new Vector2(v.x * v1.x, v.y * v1.y);
    }

    static public Vector2 ComponentProduct(this Vector2 v, float x, float y)
    {
        return new Vector2(v.x * x, v.y * y);
    }

    static public bool InsidePolygon(this Vector2 point, Vector2[] points)
    {
        int i,j;
        bool c = false;

        for (i = 0, j = points.Length - 1; i < points.Length; j = i++) {
            if( ((points[i].y >= point.y) != (points[j].y >= point.y))
            && (point.x <= (points[j].x - points[i].x) * (point.y - points[i].y) / (points[j].y - points[i].y) + points[i].x)) {
                c = !c;
            }
        }

        return c;
    }

    static public bool VeryNear(this Vector2 v, Vector2 v1)
    {
        return (v - v1).sqrMagnitude < 1e-9;
    }

    static public bool IntEquals(this Vector2 v, Vector2 v1)
    {
        return Mathf.RoundToInt(v.x) == Mathf.RoundToInt(v1.x)
            && Mathf.RoundToInt(v.y) == Mathf.RoundToInt(v1.y);
    }

    static public Vector2 SmoothStepTo(this Vector2 v, Vector2 v1, float t)
    {
        return new Vector2(
            Mathf.SmoothStep(v.x, v1.x, t),
            Mathf.SmoothStep(v.y, v1.y, t)
        );
    }

    static public Vector2 CubicSplineTo(this Vector2 a, Vector2 b, Vector2 c, Vector2 d, float t)
    {
        var u = 1 - t;
        return u*u*u*a + 3*u*u*t*b + 3*u*t*t*c + t*t*t*d;
    }
}

static public class Vector3Ext
{
    static public Vector3 WithX(this Vector3 v, float x) { return new Vector3(x, v.y, v.z); }
    static public Vector3 WithY(this Vector3 v, float y) { return new Vector3(v.x, y, v.z); }
    static public Vector3 WithZ(this Vector3 v, float z) { return new Vector3(v.x, v.y, z); }

    static public Vector3 WithXY(this Vector3 v, float x, float y) { return new Vector3(x, y, v.z); }
    static public Vector3 WithYZ(this Vector3 v, float y, float z) { return new Vector3(v.x, y, z); }
    static public Vector3 WithXZ(this Vector3 v, float x, float z) { return new Vector3(x, v.y, z); }

    static public Vector3 WithXY(this Vector3 v, Vector3 o) { return new Vector3(o.x, o.y, v.z); }
    static public Vector3 WithYZ(this Vector3 v, Vector3 o) { return new Vector3(v.x, o.y, o.z); }
    static public Vector3 WithXZ(this Vector3 v, Vector3 o) { return new Vector3(o.x, v.y, o.z); }

    static public Vector3 WithXY(this Vector3 v, Vector2 o) { return new Vector3(o.x, o.y, v.z); }
    static public Vector3 WithYZ(this Vector3 v, Vector2 o) { return new Vector3(v.x, o.x, o.y); }
    static public Vector3 WithXZ(this Vector3 v, Vector2 o) { return new Vector3(o.x, v.y, o.y); }

    static public Vector2 XY(this Vector3 v) { return new Vector2(v.x, v.y); }
    static public Vector2 YZ(this Vector3 v) { return new Vector2(v.y, v.z); }
    static public Vector2 XZ(this Vector3 v) { return new Vector2(v.x, v.z); }

    static public Vector3 Mul(this Vector3 v,Vector3 o) { return new Vector3(v.x * o.x, v.y * o.y, v.z * o.z); }
    static public Vector3 Mul(this Vector3 v, float x, float y, float z) { return new Vector3(v.x * x, v.y * y, v.z * z); }


	static public Quaternion PseudoToQuaternion(this Vector3 v){ return Quaternion.AngleAxis(v.magnitude*Mathf.Rad2Deg,v); }

    static public Vector3 Floor(this Vector3 v){return new Vector3(Mathf.Floor(v.x), Mathf.Floor(v.y), Mathf.Floor(v.z));}
    static public Vector3 Ceil(this Vector3 v) { return new Vector3(Mathf.Ceil(v.x), Mathf.Ceil(v.y), Mathf.Ceil(v.z)); }
    static public Color AsColor(this Vector3 v) { return new Color(v.x, v.y, v.z, 1); }
    static public Vector3 Clamp(this Vector3 v, float min, float max) { return new Vector3(Mathf.Clamp(v.x, min, max), Mathf.Clamp(v.y, min, max), Mathf.Clamp(v.z, min, max)); }
}

static public class Vector4Ext
{
    public static Quaternion ToQuaternion(this Vector4 v)
    {
        return new Quaternion(v.x, v.y, v.z, v.w);
    }
}

static public class ColorExt
{
    static public Vector3 AsVector(this Color c)
    {
        return new Vector3(c.r, c.g, c.b);
    }

    static public Color ToGamma(this Color c)
	{
	return new Color(ToGamma(c.r),ToGamma(c.g),ToGamma(c.b),c.a);
	}

	static public Color ToLinear (this Color c)
	{
	return new Color(ToLinear(c.r),ToLinear(c.g),ToLinear(c.b));
	}

    static public Color WithAlphaMult(this Color c, float a)
    {
        return new Color(c.r, c.g, c.b, c.a * a);
    }

	static float ToLinear (float c)
	{
		if (c > 0.04045f) {
			return Mathf.Pow ((c + 0.055f) / (1 + 0.055f), 2.4f);
		} else {
			return c / 12.92f;
		}
	}

	static float ToGamma (float c)
	{
		float ret = 0;
		if (c <= 0.0031308f) {
			ret = 12.92f * c;
		} else {
			ret = 1.055f * Mathf.Pow (c, 1 / 2.4f) - 0.055f;
		}

		//ret = Mathf.Abs(ret);


		return ret;
	}

}
