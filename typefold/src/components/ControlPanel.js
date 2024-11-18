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

  return (
    <>
      {/* 카메라 방향 변경 버튼 */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 10,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <button onClick={() => zoomDown()}>-</button>
          <button onClick={() => setZoomLevel(0)}>기본 ({zoomLevel})</button>
          <button onClick={() => zoomUp()}>+</button>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <button
            className={cameraDirection === "perspective" ? "active" : ""}
            onClick={() => setCameraDirection("perspective")}
          >
            3D 미리보기
          </button>
          <button
            className={cameraDirection === "front" ? "active" : ""}
            onClick={() => setCameraDirection("front")}
          >
            전개도 미리보기
          </button>
        </div>
        <button id="captureButton">Print</button>
      </div>
    </>
  );
}

export default ControlPanel;
