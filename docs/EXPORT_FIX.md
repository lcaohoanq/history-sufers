# Export Issue Fix

## 🐛 Problem

```
Uncaught (in promise) TypeError: ColyseusNetworkManager is not a constructor
Cannot read properties of null (reading 'createRoom')
```

## 🔍 Root Cause

The `js/network-colyseus.js` file was using the old pattern of attaching classes to `window`:

```javascript
// Old pattern (no ES6 export)
if (typeof window !== 'undefined') {
  window.NetworkManager = NetworkManager;
  window.networkManager = new NetworkManager();
}
// Missing: export statement!
```

The SPA was trying to import with ES6 syntax:
```javascript
const { ColyseusNetworkManager } = await import('./js/network-colyseus.js');
```

But there was no export, so `ColyseusNetworkManager` was `undefined`.

## ✅ Solution

Added ES6 export statement to `js/network-colyseus.js`:

```javascript
// Create global instance (for backward compatibility)
if (typeof window !== 'undefined') {
  window.NetworkManager = NetworkManager;
  window.networkManager = new NetworkManager();
  console.log('🚀 NetworkManager (Colyseus) class loaded');
}

// ES6 export for SPA
export { NetworkManager as ColyseusNetworkManager };
```

## 📝 Why This Works

1. **Backward Compatibility**: Old files using `window.networkManager` still work
2. **ES6 Module Support**: SPA can now import with `import { ColyseusNetworkManager }`
3. **Named Export**: Exports as `ColyseusNetworkManager` to match SPA expectations

## 🧪 Testing

Open browser console and test:

```javascript
// Should now work:
const { ColyseusNetworkManager } = await import('./js/network-colyseus.js');
const nm = new ColyseusNetworkManager();
console.log(nm); // Should show NetworkManager instance
```

## ✅ Result

Now the SPA can:
- ✅ Import the network manager
- ✅ Create room instances
- ✅ Connect to Colyseus server
- ✅ No more "not a constructor" errors

---

**Files Modified**: `js/network-colyseus.js`
