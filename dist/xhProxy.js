/*
MIT License

Copyright (c) 2023 cyfung1031

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const xhProxy = ((window) => {

  /** @type {globalThis.PromiseConstructor} */
  const Promise = (async () => { })().constructor;

  const keyInstance = '__xhProxy_inst__';

  const keyOriXhr = Symbol();

  // const token = String.fromCharCode(Date.now() % 26 + 97) + Math.floor(Math.random() * 23321 + 23321).toString(36);
  // const keyDone = Symbol(`__d${token}__`);
  // const keyLastReadyState = Symbol(`__lrs${token}__`);
  // const keyLastStatus = Symbol(`__lst${token}__`);
  const keyDone = Symbol();
  const keyLastReadyState = Symbol();
  const keyLastStatus = Symbol();
  const keyWaiter = Symbol();
  const keyPretentTrustedEvent = Symbol();
  const keyResponseType = Symbol();


  const promiseHelper = (f) => Promise.resolve().then(f).catch(console.warn);


  /**
   * 
   * 
  
  1. `readystatechange` (readyState = 0: UNSENT)
     - The XMLHttpRequest object is created.
  
  2. `readystatechange` (readyState = 1: OPENED)
     - After the `open()` method is called.
  
  3. `loadstart`
     - The request has started after the `send()` method is invoked.
  
  4. `readystatechange` (readyState = 2: HEADERS_RECEIVED)
     - The `send()` method has been called, and headers and status are available.
  
  5. `readystatechange` (readyState = 3: LOADING)
     - The request is downloading and the `responseText` holds partial data.
  
  6. Possible parallel events:
     a. `progress` 
        - Triggered multiple times to indicate the progress of the response data being received.
     b. `abort` 
        - If the request gets aborted.
     c. `error` 
        - If an error occurs during the request.
     d. `timeout` 
        - If the request times out.
  
  7. `readystatechange` (readyState = 4: DONE)
     - The operation is complete.
     
  8. `load`
     - If the request completes successfully.
  
  9. `loadend`
     - After the request operation completes (be it successfully with `load`, or with an error, timeout, or abort).
  
  
   * 
   * 
   */

  /**
   * 
   * Represents the additional information of each xhr instance
   * 
   * @typedef {Object} XHRConfig
   * @property {Object.<string, string>} headers - An object containing request headers.
   * @property {string?} method - The HTTP request method.
   * @property {string?} url - The request URL.
   * @property {boolean?} async - Indicates if the request is asynchronous.
   * @property {boolean?} withCredentials - Should the request be made with credentials.
   * @property {string?} body - The request body content.
   * @property {number?} readyState - The ready state of the request.
   * @property {number?} status - The HTTP status code of the response.
   * @property {boolean?} disposed - True if the xhr instance is garbage-collected. 
   */



  /**
   * 
   * A Hook Instance Per Each Xhr
   * 
   * @typedef {Object} HookInstance
   * @property {boolean?} byPassRequest
   * 
   */

  /**
   * 
   * A Hook Object
   * 
   * @typedef {Object} HookObject
   * @property {(xhr: XMLHttpRequest, config: XHRConfig)} onConfig
   * @property {(xhr: XMLHttpRequest, config: XHRConfig)} onRequest
   * @property {(xhr: XMLHttpRequest, config: XHRConfig)} onResponse
   * @property {WeakMap<XMLHttpRequest, HookInstance>} hInstMap
   *
   */


  /** 
   * 
   * Create a new XMLHttpRequest extended from a XMLHttpRequest
   * 
   * @param {typeof globalThis.XMLHttpRequest} _XMLHttpRequest 
   * 
   * */
  const xhrConstructorCreator = (_XMLHttpRequest) => {


    /** @type {WeakMap<XMLHttpRequest, any>} */
    const configMap = new WeakMap();

    /** @type {WeakMap<XMLHttpRequest, any>} */
    const responseMap = new WeakMap();

    /** @type {WeakMap<XMLHttpRequest, string>} */
    const responseTextMap = new WeakMap();

    /** @type {WeakMap<Function, Function>} */
    const oriFnMap = new WeakMap();

    /** @type {WeakMap<Function, Function>} */
    const newFnMap = new WeakMap();

    /** @type {Set<HookObject>} */
    const hooks = new Set();

    /** @type {(xhr: XMLHttpRequest, hObj: HookObject)=>HookInstance} */
    const hInstMap = (xhr, hObj) => {
      let hInst = hObj.hInstMap.get(xhr);
      if (!hInst) hObj.hInstMap.set(xhr, hInst = {})
      return hInst;
    };


    const fFunction = (xhr, f) => {

      if (typeof f !== 'function') return f;


      const g = function (...args) {
        if (args[0] instanceof Event && args[0][keyPretentTrustedEvent]) args[0] = new Proxy(args[0], fProxyHandler);
        f.apply(this, args);

      }

      newFnMap.set(f, g);
      oriFnMap.set(g, f);

      // g.getOriginal = ()=>{
      //   return oriFnMap.get(g)
      // }

      return g;

    }

    const fWaitOnRequestPlease = (xhr, f) => {

      if (typeof f !== 'function') return f;



      const g = function (...args) {
        if (args[0] instanceof Event && args[0][keyPretentTrustedEvent]) args[0] = new Proxy(args[0], fProxyHandler);

        xhr[keyWaiter] = xhr[keyWaiter].then(() => new Promise(waiterResolve => {

          f.apply(this, args);
          waiterResolve();

        }));


      }

      newFnMap.set(f, g);
      oriFnMap.set(g, f);

      // g.getOriginal = ()=>{
      //   return oriFnMap.get(g)
      // }

      return g;

    }

    const fProxyHandler = {
      get(target, prop, receiver) {

        let v = target[prop];
        if (typeof v === 'function') return () => { };
        if (prop === 'isTrusted') return true;
        return v;

      }
    };

    const fOnReadyStateChange = (xhr, f) => {
      if (typeof f !== 'function') return f;


      const config = configMap.get(xhr) || { disposed: true };

      xhr[keyDone] = 0;

      const g = function (...args) {
        if (args[0] instanceof Event && args[0][keyPretentTrustedEvent]) args[0] = new Proxy(args[0], fProxyHandler);
        xhr[keyWaiter] = xhr[keyWaiter].then(() => new Promise(waiterResolve => {


          try {
            if (xhr[keyDone] !== 1 && xhr[keyDone] !== -2) {
              config.readyState = xhr.readyState;
            }
            if (xhr[keyDone] !== 1 && xhr[keyDone] !== -2) {
              config.status = xhr.status;
            }
            // console.log(123)
            let doResponseCatch = false;
            if (xhr.readyState === 4 && xhr.status !== 0 && xhr[keyDone] === 0) {
              xhr[keyDone] = 1;
              doResponseCatch = true;
            } else if (xhr[keyDone] !== 1 && xhr[keyDone] !== -2) {
              xhr[keyLastReadyState] = xhr.readyState;
              xhr[keyLastStatus] = xhr.status;
            }

            let p = doResponseCatch ? (async () => {


              const _xhr = xhr;

              const config = configMap.get(_xhr) || { disposed: true };


              for (const hook of hooks) {
                const { onConfig, onRequest, onResponse } = hook;
                const hInst = hInstMap(_xhr, hook);
                if (typeof onResponse === 'function' && !hInst.byPassRequest) await promiseHelper(() => onResponse.call(hInst, _xhr, config));
              }

              if (xhr[keyDone] !== -2) {

                _xhr[keyDone] = 2;
                _xhr[keyLastReadyState] = _xhr.readyState;
                _xhr[keyLastStatus] = _xhr.status;
              }

            })() : Promise.resolve();

            p.then(() => {
              f.apply(this, args);
              waiterResolve();
            }).catch(e => {
              console.warn(e);
              waiterResolve();
            });


          } catch (e) {
            console.warn(e);
            waiterResolve();
          }

        }));


      }

      newFnMap.set(f, g);
      oriFnMap.set(g, f);

      // g.getOriginal = ()=>{
      //   return oriFnMap.get(g)
      // }

      return g;

    }

    const getNewFn = function (f) {

      if (typeof f !== 'function') return f;
      return newFnMap.get(f) || f;

    }

    const getOriFn = function (f) {

      if (typeof f !== 'function') return f;
      return oriFnMap.get(f) || f;

    }

    /**
     *
     * @property {string | any} xhJson
     *
     */
    class XMLHttpRequest extends _XMLHttpRequest {

      constructor(...args) {
        super(...args);
        const xhr = this;
        this[keyDone] = -1;
        this[keyWaiter] = Promise.resolve();
        configMap.set(this, {

          headers: {},

          networkBlocking() {
            this.url = 'data:text/plain;base64,Cg==';
          },

          // open / onConfig
          method: '',
          url: '',
          async: true,
          user: null,
          password: null,

          get withCredentials() {
            return xhr.withCredentials;
          }


        })
      }

      open(...args) {


        const _xhr = this;

        const config = configMap.get(_xhr) || { disposed: true };

        Object.assign(config, {
          method: args[0],
          url: args[1],
          async: args[2],
          user: args[3],
          password: args[4]
        });

        for (const hook of hooks) {
          const { onConfig, onRequest, onResponse } = hook;
          const hInst = hInstMap(_xhr, hook);
          if (typeof onConfig === 'function' && !hInst.byPassRequest) onConfig.call(hInst, _xhr, config);
        }


        if (config.method !== args[0]) args[0] = config.method;
        if (config.url !== args[1]) args[1] = config.url;
        if (config.async !== args[2]) args[2] = config.async;
        if (config.user !== args[3]) args[3] = config.user;
        if (config.password !== args[4]) args[4] = config.password;

        if (!config.preventOpen) super.open(...args);


      }


      send(...args) {


        const _config = configMap.get(this) || { disposed: true };

        _config.body = args.length > 0 ? args[0] : undefined;

        const preventSend = _config.preventSend; // by onConfig

        const req = async () => {

          let doOnResponse = false;

          const _xhr = this;

          const config = _config;


          for (const hook of hooks) {
            const { onConfig, onRequest, onResponse } = hook;
            const hInst = hInstMap(_xhr, hook);
            if (typeof onRequest === 'function' && !hInst.byPassRequest) await promiseHelper(() => onRequest.call(hInst, _xhr, config));
            if (typeof onResponse === 'function' && !hInst.byPassRequest) doOnResponse = true;
          }


          const preventSend = config.preventSend; // by onRequest

          if (!preventSend) {
            if (doOnResponse && _xhr[keyDone] === -1) _xhr.addEventListener('readystatechange', () => { }, false);
            if (config.readyState === 4 && config.status === 200) {


              const response = config.response;

              let evt;

              evt = new Event("loadstart");
              evt[keyPretentTrustedEvent] = 1;
              _xhr.dispatchEvent(evt);
              await new Promise(resolve => window.setTimeout(resolve));

              _xhr[keyLastReadyState] = 2;
              _xhr[keyLastStatus] = 0;
              _xhr[keyDone] = -2;
              evt = new Event("readystatechange");
              evt[keyPretentTrustedEvent] = 1;
              _xhr.dispatchEvent(evt);
              await new Promise(resolve => window.setTimeout(resolve));

              _xhr[keyLastReadyState] = 3;
              _xhr[keyLastStatus] = 200;
              _xhr[keyDone] = -2;
              evt = new Event("readystatechange");
              evt[keyPretentTrustedEvent] = 1;
              _xhr.dispatchEvent(evt);
              await new Promise(resolve => window.setTimeout(resolve));

              evt = new Event("progress");
              evt[keyPretentTrustedEvent] = 1;
              _xhr.dispatchEvent(evt);
              await new Promise(resolve => window.setTimeout(resolve));

              _xhr.responseType = response.responseType;
              _xhr.response = response.response;
              _xhr.responseText = response.responseText;

              _xhr[keyLastReadyState] = 4;
              _xhr[keyLastStatus] = 200;
              _xhr[keyDone] = -2;
              evt = new Event("readystatechange");
              evt[keyPretentTrustedEvent] = 1;
              _xhr.dispatchEvent(evt);
              await new Promise(resolve => window.setTimeout(resolve));

              _xhr[keyLastReadyState] = 4;
              _xhr[keyLastStatus] = 200;
              _xhr[keyDone] = -2;
              evt = new Event("load");
              evt[keyPretentTrustedEvent] = 1;
              _xhr.dispatchEvent(evt);
              await new Promise(resolve => window.setTimeout(resolve));

              _xhr[keyLastReadyState] = 4;
              _xhr[keyLastStatus] = 200;
              _xhr[keyDone] = -2;
              evt = new Event("loadend");
              evt[keyPretentTrustedEvent] = 1;
              _xhr.dispatchEvent(evt);




            } else {
              if (config.body !== undefined) super.send(config.body); else super.send();
            }
          }

        };
        if (!preventSend) {
          _config.async === false ? req() : setTimeout(req);
        }



      }


      getResponse() {
        return super.response;
      }

      setRequestHeader(...args) {
        if (args.length >= 2 && typeof args[0] === 'string') {

          const config = configMap.get(this) || { disposed: true };
          config.headers[args[0].toLowerCase()] = args[1];
        }
        return super.setRequestHeader(...args);
      };

      addEventListener(...args) {

        const config = configMap.get(this) || { disposed: true };


        if (args[0] === 'readystatechange' && typeof args[1] === 'function') {

          args[1] = fOnReadyStateChange(this, args[1])
        } else if ((args[0] === 'load' || args[0] === 'loadend') && typeof args[1] === 'function') {
          args[1] = fWaitOnRequestPlease(this, args[1]);
        } else if (args[0] === 'progress' && typeof args[1] === 'function') {
          args[1] = fFunction(this, args[1])
        }


        return super.addEventListener(...args);

      }

      removeEventListener(...args) {

        if (typeof args[1] === 'function') {
          args[1] = getNewFn(args[1])
        }

        return super.removeEventListener(...args);

      }

      set readyState(nv) {
        super.readyState = nv;
        return true;
      }

      get readyState() {
        return (this[keyDone] === 1 || this[keyDone] === -2) ? (this[keyLastReadyState] || 0) : super.readyState;
      }



      set status(nv) {
        super.status = nv;
        return true;
      }

      get status() {
        return (this[keyDone] === 1 || this[keyDone] === -2) ? (this[keyLastStatus] || 0) : super.status;
      }


      set onabort(nv) {
        super.onabort = nv;
        return true;
      }

      get onabort() {
        return super.onabort;
      }


      set onerror(nv) {
        super.onerror = nv;
        return true;
      }

      get onerror() {
        return super.onerror;
      }


      set onload(nv) {
        super.onload = fWaitOnRequestPlease(this, nv);
        return true;
      }

      get onload() {
        return getOriFn(super.onload);
      }


      set onloadend(nv) {
        super.onloadend = fWaitOnRequestPlease(this, nv);
        return true;
      }

      get onloadend() {
        return getOriFn(super.onloadend);
      }



      set onloadstart(nv) {
        super.onloadstart = nv;
        return true;
      }

      get onloadstart() {
        return super.onloadstart;
      }




      set onprogress(nv) {
        super.onprogress = fFunction(this, nv);
        return true;
      }

      get onprogress() {
        return getOriFn(super.onprogress);
      }



      set onreadystatechange(nv) {
        super.onreadystatechange = fOnReadyStateChange(this, nv);
        return true;
      }

      get onreadystatechange() {
        return getOriFn(super.onreadystatechange);
      }

      set ontimeout(nv) {
        super.ontimeout = nv;
        return true;
      }

      get ontimeout() {
        return super.ontimeout;
      }


      get response() {
        if (super.readyState === 4 && super.status !== 0) {
          if (responseMap.has(this)) {
            return responseMap.get(this);
          }
          const response = super.response
          responseMap.set(this, response);
          return response;
        } else if (this[keyLastReadyState] === 4 && this[keyLastStatus] === 200 && this[keyDone] === -2) {

          if (responseMap.has(this)) {
            return responseMap.get(this);
          }
          return null;
        } else {
          return (!this.responseType || this.responseType === 'text') ? "" : null;
        }
      }


      set response(nv) {
        responseMap.set(this, nv)
        return true;
      }



      set responseType(nv) {
        this[keyResponseType] = nv;
        return true;
      }


      get responseType() {
        if (keyResponseType in this) {
          return this[keyResponseType];
        }
        return super.responseType;
      }

      get responseText() {
        if (super.readyState === 4 && super.status !== 0) {
          if (responseTextMap.has(this)) {
            return responseTextMap.get(this);
          }
          const responseText = super.responseText
          responseTextMap.set(this, responseText);
          return responseText;
        } else {
          return '';
        }
      }


      set responseText(nv) {
        responseTextMap.set(this, nv)
        return true;
      }

      get xhJson() {
        const responseType = this.responseType;
        let jsonResponse = null;
        try {
          if (!responseType || responseType === 'text') {
            return JSON.parse(this.response || this.responseText);
          } else if (responseType === 'json') {
            let r = this.response;
            if (typeof r === 'string') return JSON.parse(r);
            return r || JSON.parse(this.responseText);
          }
        } catch (e) {
          console.warn(e);
        }
        return jsonResponse;
      }
      set xhJson(nv) {
        const responseType = this.responseType;
        try {
          if (!responseType || responseType === 'text') {
            this.response = this.responseText = JSON.stringify(nv);
          } else if (responseType === 'json') {
            let r = this.response;
            if (typeof r === 'string') return this.response = this.responseText = JSON.stringify(nv);
            this.response = nv;
            this.responseText = '';
          }
        } catch (e) {
          console.warn(e);
        }
        return true;
      }

    }

    XMLHttpRequest[keyInstance] = XMLHttpRequest;
    XMLHttpRequest[keyOriXhr] = _XMLHttpRequest;

    /** @param {HookObject?} hObj */
    XMLHttpRequest.__xhProxy_hook_ = (hObj) => {
      hObj && hooks.add(hObj);
    };

    /** @param {HookObject?} hObj */
    XMLHttpRequest.__xhProxy_unhook_ = (hObj) => {
      hObj && hooks.delete(hObj);
    };

    _XMLHttpRequest[keyInstance] = XMLHttpRequest;

    return XMLHttpRequest;

  }

  /** @type {typeof xhrConstructorCreator} */
  const ts1 = (x) => x;

  /** 
   * 
   * Hook (or reuse) the XMLHttpRequest
   * 
   * @param {typeof globalThis.XMLHttpRequest} _XMLHttpRequest
   * 
   *  */
  const makeXHRClass = (_XMLHttpRequest) => {
    const XMLHttpRequest = ts1(_XMLHttpRequest[keyInstance]) || xhrConstructorCreator(_XMLHttpRequest);
    _XMLHttpRequest[keyInstance] = XMLHttpRequest;
    XMLHttpRequest[keyInstance] = XMLHttpRequest;
    return XMLHttpRequest;
  }


  let q = (new (ts1(function () { })));
  /** @typedef {q} XMLHttpRequest */



  const res = {
    /**
     * 
     * Unhook the entire XMLHttpRequest and restore to the native one
     * 
     * @param {Window} win - Window parent for the XMLHttpRequest
     * 
     */
    unhook(win = window) {
      const ori = ((win || 0).XMLHttpRequest || 0)[keyOriXhr];
      if (!ori) console.warn("The current XHR is not hooked by xhProxy")
      if (ori) win.XMLHttpRequest = ori;
    },
    /** 
     * 
     * Hook the XMLHttpRequest with adding one HookObject
     * 
     * @param {HookObject} hObj - Hook Object to represent onRequest and onResponse, etc.
     * @param {Window} win - Window parent for the XMLHttpRequest
     * 
     * */
    hook(hObj, win = window) {
      const XMLHttpRequest = (win || 0).XMLHttpRequest;
      if (!XMLHttpRequest) throw new Error();
      const inst = makeXHRClass(XMLHttpRequest);
      win.XMLHttpRequest = inst;
      if (!hObj.hInstMap) hObj.hInstMap = new WeakMap();
      inst.__xhProxy_hook_(hObj);
      return {
        unhook: () => inst.__xhProxy_unhook_(hObj)
      }
    }
  };


  const resFn = () => res;


  /** @type {typeof resFn} */
  const ts2 = (x) => x;


  return (ts2(this.xhProxy) || (this.xhProxy = res));

})(this);