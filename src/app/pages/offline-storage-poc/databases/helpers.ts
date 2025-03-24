export function randomString(len: number) {
  const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var randomString = '';
  for (var i = 0; i < len; i++) {
    var randomPoz = Math.floor(Math.random() * charSet.length);
    randomString += charSet.substring(randomPoz, randomPoz + 1);
  }
  return randomString;
}

// This function takes an object as a parameter and returns the size of data in bytes
export function calculateObjectSize(obj: any) {
  // Initialize a variable to store the total size
  let totalSize = 0;
  // Get the keys of the object
  let keys = Object.keys(obj);
  // Loop through each key
  for (let key of keys) {
    // Get the value of the key
    let value = obj[key];
    // Check the type of the value
    if (typeof value === 'string') {
      // If the value is a string, add its length to the total size
      totalSize += value.length;
    } else if (typeof value === 'number') {
      // If the value is a number, add 8 bytes to the total size
      totalSize += 8;
    } else if (typeof value === 'boolean') {
      // If the value is a boolean, add 4 bytes to the total size
      totalSize += 4;
    } else if (typeof value === 'object' && value !== null) {
      // If the value is an object and not null, recursively call the function and add the result to the total size
      totalSize += calculateObjectSize(value);
    }
    // Ignore other types of values such as undefined, function, symbol, etc.
  }
  // Return the total size
  return totalSize;
}

export const rowsToInsert = 300;
