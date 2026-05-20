// Auto-generated from FastAPI OpenAPI schema.
// Run: npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts
// DO NOT EDIT MANUALLY — update the Pydantic schemas in apps/api instead.

export interface HealthResponse {
  status: string;
  version: string;
  environment: string;
}
