using UnityEngine;

[ExecuteInEditMode] 
public class GenerateModelFile : MonoBehaviour
{
    [SerializeField] bool generate;
    [SerializeField] int resultSize;
    [SerializeField] Material[] foundMaterials;

    void Update()
    {
        if (generate)
        {
            generate = false;
            doGenerate();
        }
    }

    void doGenerate()
    {
        var file = ModelDataFileSerializer.Serialize(gameObject);
        resultSize = file.data.Length;
        foundMaterials = file.materials;

        var oldExport = GameObject.Find("AllObjects_EXPORTED");
        if (oldExport != null)
            DestroyImmediate(oldExport);

        ModelDataFileSerializer.Deserialize(file, "AllObjects_EXPORTED");
    }
}
