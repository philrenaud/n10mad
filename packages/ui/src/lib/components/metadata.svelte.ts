export type Metadata = {
  key: string;
  value: string | unknown;
}
export function createMetadataStore() {
  let metadata: Metadata[] = $state([]);
  return {
    get metadata() {
      return metadata;
    },
    add({key, value}: Metadata) {
      metadata.push({ key, value })
    },
    set(arr: Metadata[]) {
      metadata = arr;
    },
    clear() {
      metadata = [];
    }
  }
}
