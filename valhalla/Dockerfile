FROM ghcr.io/valhalla/valhalla-scripted:3.9.1@sha256:6238809f9dc3057743d70a20efd3911ec38e458bfa13a0601909b58f68dfd956

ENV PYTHONDONTWRITEBYTECODE=1
COPY server.py start.sh /opt/propertyscore-valhalla/
ENTRYPOINT ["/bin/bash", "/opt/propertyscore-valhalla/start.sh"]
CMD []
