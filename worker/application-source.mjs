// Records and cached forms from before source tracking belong to the CZ-PL campaign.
export function applicationSource(value) {
 if (value === undefined) return '/cz-pl/';
 return ['/', '/cz-pl/'].includes(value) ? value : null;
}

export function applicationSourceLabel(value) {
 const source = applicationSource(value);
 return source ? 'ukraine.hsa.hu' + source : 'Ismeretlen';
}
