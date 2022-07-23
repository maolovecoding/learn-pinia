import { createApp } from "vue";
import { createPinia } from "@/pinia";
import App from "./App.vue";
const pinia = createPinia();
// 使用pinia插件
const plugin = ({ store }: any) => {
  const local = localStorage.getItem("counter");
  if (local) {
    store.$state = JSON.parse(local);
  }
  store.$subscribe((mutation: any, state: any) => {
    localStorage.setItem("counter", JSON.stringify(state));
  });
};
pinia.use(plugin);
createApp(App)
  // 使用pinia
  .use(pinia)
  .mount("#app");
