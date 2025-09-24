# Debug with Browser DevTools (Recommended Approach)

## 🎯 **Why Browser DevTools is Better**

1. **Real-time debugging** - See exactly what's happening
2. **No test setup** - Use the actual application
3. **Network inspection** - See actual HTTP requests/responses
4. **Console access** - Real frontend logs
5. **No timeouts** - Interactive debugging

## 🔧 **Step-by-Step Debugging Process**

### **Step 1: Open Browser DevTools**
1. Open the chatbot in your browser
2. Press `F12` or right-click → "Inspect"
3. Go to **Network** tab
4. Go to **Console** tab (separate window/tab)

### **Step 2: Test File Upload**
1. Upload an image to the chat
2. **Check Network tab**:
   - Look for `POST /api/files/upload` - should be `200 OK`
   - Look for `GET /api/files/list/{sessionId}` - should be `200 OK`
3. **Check Console tab**:
   - Should see file upload success messages
   - Should see file list fetch success

### **Step 3: Test Chat Message (The Problem)**
1. Type a message like "analyze this image"
2. Hit send
3. **Check Network tab**:
   - Look for `POST /api/agent/stream`
   - **This is where the error occurs**
4. **Check Console tab**:
   - Look for JSON serialization errors
   - Look for circular reference warnings
   - Look for undefined value warnings

### **Step 4: Inspect Request Body**
1. In Network tab, click on the failed `/api/agent/stream` request
2. Go to **Request** section
3. Look at the **Request Payload**
4. **This will show the malformed JSON**

## 🔍 **What to Look For**

### **Expected Request Body:**
```json
{
  "messages": [
    {
      "role": "user", 
      "content": "analyze this image"
    }
  ],
  "teamId": "blawby-ai",
  "sessionId": "uuid-here",
  "attachments": [
    {
      "name": "image.jpg",
      "size": 12345,
      "type": "image/jpeg", 
      "url": "/api/files/file-id-here"
    }
  ]
}
```

### **Possible Malformed JSON Issues:**
- Circular references in objects
- `undefined` values that don't serialize
- Functions in objects
- DOM elements in objects
- Corrupted attachment data

## ✅ **This Approach Will Show Us:**
1. **Exact malformed JSON** being sent
2. **Which part of the request** is corrupted
3. **Frontend error messages** in console
4. **Network timing** and response details
5. **Real user interaction flow**
