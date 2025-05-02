function ControlPanel({
  cameraDirection,
  onHandlePerspective,
  onHandleFront,
  onHandleFold, // 새로 추가된 폴드 핸들러
  foldingState, // 새로 추가된 폴딩 상태
  children,
}) {
  return (
    <>
      {/* 카메라 방향 변경 버튼 */}
      <div className="cameraControl">
        <div className="cameraDirection">
          <button
            className={`controlButton ${cameraDirection === "perspective" ? "active" : ""}`}
            onClick={() => {
              onHandlePerspective();
            }}
            disabled={foldingState === 'folding' || foldingState === 'unfolding'}
          >
            Fold (3D)
          </button>

          <button
            className={`controlButton ${cameraDirection === "front" ? "active" : ""}`}
            onClick={() => {
              onHandleFront();
            }}
            disabled={foldingState === 'folding' || foldingState === 'unfolding'}
          >
            Unfold (2D)
          </button>
          
          {/* 새로 추가된 애니메이션 버튼 - 접기/펼치기 애니메이션 실행 */}
          {onHandleFold && (
            <button
              className={`controlButton ${foldingState === 'folding' || foldingState === 'unfolding' ? "active" : ""}`}
              onClick={onHandleFold}
              disabled={foldingState === 'folding' || foldingState === 'unfolding'}
            >
              {foldingState === '3d' || foldingState === 'folding' ? 'Unfold Animation' : 'Fold Animation'}
            </button>
          )}
          
          {children}
        </div>
      </div>
    </>
  );
}

export default ControlPanel;