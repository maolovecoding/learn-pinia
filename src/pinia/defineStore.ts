import {
  getCurrentInstance,
  inject,
  effectScope,
  EffectScope,
  reactive,
  computed,
  ComputedRef,
  isRef,
} from "vue";
import { IRootPinia } from "./createPinia";
import { symbolPinia } from "./rootStore";

export function defineStore(options: IPiniaStoreOptions): any;
export function defineStore(
  id: string,
  options: Pick<IPiniaStoreOptions, "actions" | "getters" | "state">
): any;
export function defineStore(id: string, setup: () => any): any;
export function defineStore(idOrOptions: any, storeSetup?: any) {
  let id: string, options: any;
  if (typeof idOrOptions === "string") {
    id = idOrOptions;
    options = storeSetup;
  } else {
    // 这里就是一个参数的形式 id参数定义在对象内
    options = idOrOptions;
    id = idOrOptions.id;
  }
  // 是否是一个setup函数
  const isSetupStore = typeof storeSetup === "function";

  // 注册一个store
  function useStore() {
    // 必须在setup中使用
    const currentInstance = getCurrentInstance();
    if (!currentInstance) throw new Error("pinia 需要在setup函数中使用");
    // 注入 pinia
    const pinia = inject<IRootPinia>(symbolPinia)!;
    // 还没注册
    if (!pinia._s.has(id)) {
      if (isSetupStore) {
        // 创建setupStore
        createSetupStore(id, storeSetup, pinia);
      } else {
        // counter:state:{count:0}
        createOptionsStore(id, options, pinia);
      }
    }
    // 获取store
    const store = pinia._s.get(id);
    return store;
  }
  return useStore;
}
const isObject = (val: unknown): val is object =>
  val != null && typeof val === "object";
const mergeReactiveObject = (target: any, partialState: any) => {
  for (const key in partialState) {
    // 不考虑原型属性
    if (!Object.hasOwn(partialState, key)) continue;
    const oldValue = target[key];
    const newValue = partialState[key];
    // 状态可能是ref ref是对象 但是不能递归
    if (isObject(oldValue) && isObject(newValue) && !isRef(newValue)) {
      target[key] = mergeReactiveObject(oldValue, newValue);
    } else {
      target[key] = newValue;
    }
  }
  return target;
};
const createSetupStore = (id: string, setup: () => any, pinia: IRootPinia) => {
  function $patch(partialStateOrMutation: any) {
    if (typeof partialStateOrMutation === "function") {
      partialStateOrMutation(store);
    } else {
      mergeReactiveObject(store, partialStateOrMutation);
    }
  }
  const partialStore = {
    $patch,
    $reset(){
      console.warn(`setup store 不允许使用 $reset 方法`)
    }
  };
  // 一个store 就是一个reactive对象
  const store = reactive(partialStore);
  // store单独的scope
  let scope: EffectScope;
  // scope可以停止所有的store 每个store也可以停止自己的
  const setupStore = pinia._e.run(() => {
    scope = effectScope();
    return scope.run(() => setup());
  });
  // 处理action的this问题
  for (const key in setupStore) {
    const prop = setupStore[key];
    if (typeof prop === "function") {
      // 扩展action
      setupStore[key] = wrapAction(key, prop, store);
    }
  }
  Object.assign(store, setupStore);
  // 向pinia中放入store
  pinia._s.set(id, store);
  return store;
};

const createOptionsStore = (
  id: string,
  options: Pick<IPiniaStoreOptions, "actions" | "getters" | "state">,
  pinia: IRootPinia
) => {
  const { state, getters = {}, actions } = options;
  const setup = () => {
    // 缓存 state
    if (pinia.state.value[id]) {
      console.warn(`${id} store 已经存在！`);
    }
    const localState = (pinia.state.value[id] = state ? state() : {});
    return Object.assign(
      localState,
      actions,
      Object.keys(getters).reduce(
        (computedGetter: { [key: string]: ComputedRef<any> }, name) => {
          // 计算属性可缓存
          computedGetter[name] = computed(() => {
            // 我们需要获取当前的store是谁
            return Reflect.apply(getters[name], store, [store]);
          });
          return computedGetter;
        },
        {}
      )
    );
  };
  const store = createSetupStore(id, setup, pinia);
  // 重置状态API
  (store as any).$reset = function $reset() {
    const newState = state ? state() : {};
    store.$patch(($state: any) => {
      Object.assign($state, newState);
    });
  };
};

const wrapAction = (key: string, action: any, store: any) => {
  return (...args: Parameters<typeof action>) => {
    // 触发action之前 可以触发一些额外的逻辑
    const res = Reflect.apply(action, store, args);
    // 返回值也可以做处理
    return res;
  };
};

export interface IPiniaStoreOptions {
  id?: string;
  state?: () => any;
  getters?: any;
  actions?: any;
}
