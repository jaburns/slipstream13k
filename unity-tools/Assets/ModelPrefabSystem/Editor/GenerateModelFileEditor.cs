using System.Linq;
using UnityEngine;
using UnityEditor;

[CustomEditor(typeof(GenerateModelFile))]
public class GenerateModelFileEditor : Editor
{
    GenerateModelFile targ { get { return target as GenerateModelFile; } }

    public override void OnInspectorGUI()
    {
        var btn = new GUIStyle("button");
        btn.fontSize = 16;
        btn.fontStyle = FontStyle.Bold;

        GUILayout.Space(5);

        if (GUILayout.Button("Export", btn, GUILayout.Height(40)))
        {
            var file = ModelDataFileSerializer.Serialize(targ.gameObject);
            targ.latestSize = file.data.Length;
            var foundMaterials = file.materials;

            var oldExport = GameObject.Find("AllObjects_EXPORTED");
            if (oldExport != null)
                DestroyImmediate(oldExport);

            ModelDataFileSerializer.Deserialize(file, "AllObjects_EXPORTED", file.modelIndices.Values.ToList());

            Debug.Log(ModelDataFileSerializer.CreateJSLookupForModelIndices(file.modelIndices));
        }

        GUILayout.Space(5);

        GUILayout.BeginHorizontal();

            var a = new GUIStyle();
            a.fontSize = 16;
            a.fontStyle = FontStyle.Bold;
            GUILayout.Label("Size:", a);

            var b = new GUIStyle(a);
            b.alignment = TextAnchor.MiddleRight;
            GUILayout.Label(targ.latestSize.ToString(), b);

        GUILayout.EndHorizontal();

        GUILayout.Space(5);
    }
}
