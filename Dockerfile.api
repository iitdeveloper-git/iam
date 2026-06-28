FROM python:3.12-slim
WORKDIR /app
COPY backend /app
RUN pip install --no-cache-dir .
ENV PYTHONPATH=/app/src
EXPOSE 7860
CMD ["sh", "-c", "uvicorn iitd_iam.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
