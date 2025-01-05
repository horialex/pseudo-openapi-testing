import yaml from 'js-yaml';
import path from 'path';
import fs from 'fs';

// Load OpenAPI specification file
export function loadOpenApiSpec(fileName: string) {
    try {
        const openApiSpec = yaml.load(fs.readFileSync(path.join(__dirname, fileName), 'utf8'));
        return openApiSpec
    } catch (error) {
        console.error("Error loading OpenAPI specification file: ", error)
        throw error;
    }
}