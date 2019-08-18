using UnityEngine;

[ExecuteInEditMode]
public class SimpleCube : MonoBehaviour
{
    public bool setFilterToSimpleCube;

    void Update()
    {
        if (setFilterToSimpleCube) {
            setFilterToSimpleCube = false;
            run();
        }
    }

    void run()
    {
        var mf = GetComponent<MeshFilter>();
        mf.sharedMesh = generateSimpleCubeMesh();
    }

    static Mesh generateSimpleCubeMesh()
    {
        var mesh = new Mesh();

        mesh.vertices = new Vector3[] {
            .5f * new Vector3(-1, -1, -1),
            .5f * new Vector3( 1, -1, -1),
            .5f * new Vector3(-1,  1, -1),
            .5f * new Vector3( 1,  1, -1),
            .5f * new Vector3(-1, -1,  1),
            .5f * new Vector3( 1, -1,  1),
            .5f * new Vector3(-1,  1,  1),
            .5f * new Vector3( 1,  1,  1),
        };

        mesh.triangles = new int[] {
            1,0,2,
            1,2,3,

            4,5,6,
            6,5,7,

            5,3,7,
            5,1,3,

            0,6,2,
            0,4,6,

            4,0,5,
            0,1,5,

            2,6,7,
            7,3,2
        };

        mesh.RecalculateBounds();
        return mesh;
    }
}

