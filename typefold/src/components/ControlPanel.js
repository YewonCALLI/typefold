function ControlPanel({
  cameraDirection,
  onHandlePerspective,
  onHandleFront,
  children,
}) {
  return (
    <>
      {/* 카메라 방향 변경 버튼 */}
      <div className="cameraControl">
        <div className="cameraDirection">
          <button
            className="controlButton"
            onClick={() => {
              onHandlePerspective();
            }}
          >
            Fold (3D)
          </button>

          <button
            className="controlButton"
            onClick={() => {
              onHandleFront();
            }}
          >
            Unfold (2D)
          </button>
          {children}
        </div>
      </div>
    </>
  );
}

export default ControlPanel;
