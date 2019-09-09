using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class Driver : MonoBehaviour
{
    [SerializeField] GameObject camera;

    [SerializeField] float bankAccel = 0.01f;
    [SerializeField] float maxBankVel = 0.1f;
    [SerializeField] float maxBank = Mathf.PI / 4f;
    [SerializeField] float bankRestore = 0.95f;

    [SerializeField] float pitchAccel = 0.01f;
    [SerializeField] float maxPitchVel = 0.1f;
    [SerializeField] float maxPitch = Mathf.PI / 4f;
    [SerializeField] float pitchRestore = 0.95f;

    [SerializeField] float bankRotation = 0.1f;

    Quaternion velocityOrientation;

    float controlBank;
    float controlBankVel;

    float controlPitch;
    float controlPitchVel;

    float yaw;

    void Start()
    {
        velocityOrientation = transform.rotation;
    }

    void Update()
    {
        {
            if (Input.GetKey(KeyCode.UpArrow)) {
                controlPitchVel += pitchAccel;
                if (controlPitchVel > maxPitchVel) controlPitchVel = maxPitchVel;
            } else if (Input.GetKey(KeyCode.DownArrow)) {
                controlPitchVel -= pitchAccel;
                if (controlPitchVel < -maxPitchVel) controlPitchVel = -maxPitchVel;
            }  else {
                controlPitchVel *= pitchRestore;
            }
            controlPitch += controlPitchVel;
            if (controlPitch > maxPitch) controlPitch = maxPitch;
            if (controlPitch < -maxPitch) controlPitch = -maxPitch;
        }
        {
            if (Input.GetKey(KeyCode.LeftArrow)) {
                controlBankVel += bankAccel;
                if (controlBankVel > maxBankVel) controlBankVel = maxBankVel;
            } else if (Input.GetKey(KeyCode.RightArrow)) {
                controlBankVel -= bankAccel;
                if (controlBankVel < -maxBankVel) controlBankVel = -maxBankVel;
            }  else {
                controlBankVel = controlBank * (bankRestore - 1f);
            }
            controlBank += controlBankVel;
            if (controlBank > maxBank) controlBank = maxBank;
            if (controlBank < -maxBank) controlBank = -maxBank;
        }

        yaw -= bankRotation * controlBank;

        var shipOrientation = Quaternion.AngleAxis(yaw * Mathf.Rad2Deg, Vector3.up)
            * Quaternion.AngleAxis(controlPitch * Mathf.Rad2Deg, Vector3.right)
            * Quaternion.AngleAxis(controlBank * Mathf.Rad2Deg, Vector3.forward);

        velocityOrientation = shipOrientation;

        transform.localRotation = shipOrientation;
        transform.position += velocityOrientation * new Vector3(0, 0, .1f);

        // Camera

        var cameraSeekPos = transform.position - transform.forward * 5;
        var cameraSeekRot = Quaternion.LookRotation(transform.forward);
        cameraSeekPos += Vector3.up * 2;

        camera.transform.position += (cameraSeekPos - camera.transform.position) / 5f;
        camera.transform.rotation = Quaternion.Slerp(camera.transform.rotation, cameraSeekRot, 1f / 5f);
    }
}
