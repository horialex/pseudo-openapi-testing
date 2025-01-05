export function toFormData<T extends { [key: string]: any }>(data: T): { [key: string]: string | number | boolean } {
    return Object.entries(data).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
            acc[key] = typeof value === 'object' ? JSON.stringify(value) : value;
        }
        return acc;
    }, {} as { [key: string]: string | number | boolean });
}