import { createApp } from "vue";
import { createPinia } from "@/pinia";
import App from "./App.vue";

createApp(App)
  // 使用pinia
  .use(createPinia())
  .mount("#app");
