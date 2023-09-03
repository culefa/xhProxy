# xhProxy
Intercepting browser's http requests which made by XMLHttpRequest.


## 简介

xhProxy是用于拦截浏览器 XMLHttpRequest 对象的轻量库，它可以在 XMLHttpRequest 对象发起请求之前、收到响应内容之后以及发生错误时获得处理权，通过它你可以提前对请求、响应以及错误进行一些预处理。xhProxy具有很好的兼容性。

## 使用

### 安装

- CDN引入

  ```html
  <script src="https://cdn.jsdelivr.net/gh/culefa/xhProxy@3b19feb39652ae41863f3db96e2fb6f99aaffb9b/dist/xhProxy.min.js"></script>
  ```

  引入后会有一个名为"xhProxy"的全局对象，通过它可以调用API，如`xhProxy.hook(hookObject)`

一个简单示例：

```js
xhProxy.hook({
    // open - 请求发起前进入
    onConfig: (xhr, config) => {
        console.log(config.url)
    },
    // send - 请求发起前进入
    onRequest: (xhr, config) => {
        console.log(config.url)
    },
    // 请求成功后进入
    onResponse: (xhr, config) => {
        console.log(xhr.xhJson) // console.log(xhr.response)
    }
})
```

现在，我们便拦截了浏览器中通过`XMLHttpRequest`发起的所有网络请求！在请求发起前，会先进入`onConfig`和`onRequest`钩子，如果请求成功，则会进入`onResponse`钩子。我们可以更改参数`config`来修改修改数据。


### API介绍

#### `hook(hookObject, [window])`

拦截全局`XMLHttpRequest`

参数：

- `hookObject`是一个对象，包含三个可选的钩子`onConfig`, `onRequest`、`onResponse`，我们可以直接在这三个钩子中对请求进行预处理。
- `window`：可选参数，默认情况会使用当前窗口的`window`对象，如果要拦截iframe中的请求，可以将`iframe.contentWindow` 传入，注意，只能拦截**同源**的iframe页面（不能跨域）。

返回值：
`HookReturnObject`

HookReturnObject 是一个对象，包含了 `unhook`
- `unhook()`：取消對該hookObject的拦截



#### `unhook([window])`
取消全局拦截；取消后 `XMLHttpRequest` 将不会再被代理，浏览器原生`XMLHttpRequest` 会恢复到全局变量空间


#### 示例

```javascript

function async_digestMessage(message) {
    return new Promise(function (resolve) {
        var msgUint8 = new TextEncoder("utf-8").encode(message);
        crypto.subtle.digest('SHA-256', msgUint8).then(
            function (hashBuffer) {
                var hashArray = Array.from(new Uint8Array(hashBuffer));
                var hashHex = hashArray.map(function (b) { return b.toString(16).padStart(2, '0') }).join('');
                return resolve(hashHex);
            });
    })
}

xhProxy.hook({
    onConfig: (xhr, config) => {
        if(config.url.includes('testing3.json')) config.url = 'testing4.json';
        if(config.url.includes('testing5.json')) this.byPassRequest = true;
    },
    onRequest: (xhr, config) => {

        if(config.url.includes('testing6.json')) {
            config.readyState = 4;
            config.status = 200;
            config.response = {
                responseType: 'json',
                response: {test: 6},
                responseText: ''
            }
        }
    },
    onResponse: (xhr, config) => {
        if (config.url.includes('testing1.json')) xhr.xhJson = { test: 1 };
        if (config.url.includes('testing2.json')) {
            return new Proxy(resolve => {
                async_digestMessage('test-2').then(res => {
                    xhr.xhJson = { test: res };
                    resolve();
                });
            });
        }
    }
})

// 取消拦截
xhProxy.unhook();
```
