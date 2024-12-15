function ControlPanel({
  zoomLevel,
  setZoomLevel,
  cameraDirection,
  setCameraDirection,
}) {
  const zoomUp = () => {
    setZoomLevel(zoomLevel - 1);
  };

  const zoomDown = () => {
    setZoomLevel(zoomLevel + 1);
  };

  console.log("zoomLevel", zoomLevel);

  return (
    <>
      {/* 카메라 방향 변경 버튼 */}
      <div className="cameraControl">
        <div className="zoomControl">
          <button onClick={() => zoomDown()} className="zoomButton">
            -
          </button>
          <button onClick={() => setZoomLevel(0)} id="defaultZoom">
            Zoom : {zoomLevel}
          </button>
          <button onClick={() => zoomUp()} className="zoomButton">
            +
          </button>
        </div>

        <div className="cameraDirection">
          <button
            className={cameraDirection === "perspective" ? "active" : ""}
            onClick={() => setCameraDirection("perspective")}
          >
            3D Viewport
          </button>
          <span>|</span>

          <button
            className={cameraDirection === "front" ? "active" : ""}
            onClick={() => setCameraDirection("front")}
          >
            Figure Front View
          </button>
        </div>
      </div>
    </>
  );
}

export default ControlPanel;
