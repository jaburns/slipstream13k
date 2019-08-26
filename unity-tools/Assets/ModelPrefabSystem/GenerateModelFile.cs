using UnityEngine;

[ExecuteInEditMode] 
public class GenerateModelFile : MonoBehaviour
{
    [SerializeField] bool generate;

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
        Debug.Log(ModelDataFileSerializer.Serialize(gameObject).Length);

        ModelDataFileSerializer.Deserialize(ModelDataFileSerializer.Serialize(gameObject));
    }
}
