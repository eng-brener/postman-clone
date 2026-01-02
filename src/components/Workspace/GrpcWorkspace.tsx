export const GrpcWorkspace = () => (
  <>
    <div className="url-bar-container">
      <div className="modal-text">gRPC request builder coming soon.</div>
    </div>
    <div className="workspace-grid">
      <div className="request-pane">
        <div className="pane-header">
          <div className="tabs">
            <div className="tab active">Request</div>
          </div>
        </div>
        <div className="pane-content">
          <div className="modal-text">Placeholder for gRPC request inputs.</div>
        </div>
      </div>
      <div className="response-pane">
        <div className="pane-header">
          <div className="tabs">
            <div className="tab active">Response</div>
          </div>
        </div>
        <div className="pane-content">
          <div className="modal-text">Send a gRPC request to see the response here.</div>
        </div>
      </div>
    </div>
  </>
);
