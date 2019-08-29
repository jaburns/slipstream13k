using System.Linq;
using UnityEngine;
using UnityEditor;
using System.IO;
using System.Collections.Generic;

[CustomEditor(typeof(GenerateModelFile))]
public class GenerateModelFileEditor : Editor
{
    GenerateModelFile targ { get { return target as GenerateModelFile; } }

    const string MODELS_OUTPUT_FILE = "/../../blobs/00_models.blob";
    const string CONSTS_JSON_FILE = "/../../src/constants.json";
    const string MODEL_INDEX_CONST_PREFIX = "G_MODEL_INDEX_";

    public override void OnInspectorGUI()
    {
        var btn = new GUIStyle("button");
        btn.fontSize = 16;
        btn.fontStyle = FontStyle.Bold;

        GUILayout.Space(5);

        if (GUILayout.Button("Export", btn, GUILayout.Height(40)))
            doExport();

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

        EditorGUI.BeginChangeCheck();
        EditorGUILayout.PropertyField(serializedObject.FindProperty("flatShadedMaterials"), true);
        if(EditorGUI.EndChangeCheck()) serializedObject.ApplyModifiedProperties();

        GUILayout.Space(5);
    }

    private void doExport()
    {
        var file = ModelDataFileSerializer.Serialize(targ.gameObject, targ.flatShadedMaterials);
        targ.latestSize = file.data.Length;
        var foundMaterials = file.materials;

        var oldExport = GameObject.Find("AllObjects_EXPORTED");
        if (oldExport != null)
            DestroyImmediate(oldExport);

        ModelDataFileSerializer.Deserialize(file, "AllObjects_EXPORTED", file.modelIndices.Values.ToList());

        File.WriteAllBytes(Application.dataPath + MODELS_OUTPUT_FILE, file.data);

        var jsConstLines = File.ReadAllLines(Application.dataPath + CONSTS_JSON_FILE)
            .Where(x => x.IndexOf("G_MODEL_INDEX_") < 0)
            .ToList();

        for (int i = 0; i < jsConstLines.Count; ++i)
        {
            if (jsConstLines[i].IndexOf("__EOF__") < 0)
                continue;

            foreach (var kvp in file.modelIndices)
                jsConstLines.Insert(i, "    \"" + MODEL_INDEX_CONST_PREFIX + kvp.Key + "\": " + kvp.Value + ",");

            break;
        }

        File.WriteAllLines(Application.dataPath + CONSTS_JSON_FILE, jsConstLines);
    }
}
