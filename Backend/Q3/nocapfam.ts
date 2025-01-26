// Mock `yap` function for logging
export function yap(message: string, error: Error) {
  console.error(`${message}:`, error.message || error);
}

// Implementation of `skibidi`
export function skibidi(asyncFunction) {
  return {
    lowKey: function (errorHandler) {
      asyncFunction()
        .then((result) => result)
        .catch((error) => errorHandler(error));
      return this; // Enables chainability
    },
  };
}