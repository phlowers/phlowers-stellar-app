interface ProcessedDataItem {
  name: string;
  code: string;
}

export function addCodesForPselect(data: any): any {
  const generateCodeFromName = (name: string): string => {
    return (
      name
        .toLowerCase()
        .replace(/[àáâäãå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôöõ]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ýÿ]/g, 'y')
        .replace(/[ç]/g, 'c')
        .replace(/[ñ]/g, 'n')
        .replace(/[æ]/g, 'ae')
        .replace(/[œ]/g, 'oe')
        // " ", "-", ".", "/", "\" = "_"
        .replace(/[\s\-./\\]/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        // 2+ underscore = "_"
        .replace(/_{2,}/g, '_')
        // leading and trailing underscores are removed
        .replace(/(^_+)|(_+$)/g, '')
    );
  };

  if (Array.isArray(data)) {
    return data.map((item) => addCodesForPselect(item) as ProcessedDataItem);
  }

  if (typeof data === 'object' && data !== null) {
    const result: any = { ...data };

    if (result.name && !result.code) {
      result.code = generateCodeFromName(result.name);
    }

    Object.keys(result).forEach((key) => {
      if (key !== 'name' && key !== 'code') {
        result[key] = addCodesForPselect(result[key]);
      }
    });

    return result;
  }

  return data;
}
