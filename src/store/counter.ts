import { defineStore } from "@/pinia";
import { computed, reactive, toRefs } from "vue";

export default defineStore("counter", {
  state() {
    return {
      count: 0,
    };
  },
  getters: {
    doubleCounter(): number {
      return this.count * 2;
    },
  },
  // 同步异步都在action里面
  actions: {
    increment(num: number) {
      this.count += num;
    },
  },
});

// 第二个参数还可以是一个setup函数
// export default defineStore("counter", () => {
//   const state = reactive({
//     count: 0,
//   });
//   const doubleCounter = computed(() => state.count * 2);
//   const increment = (num: number) => (state.count += num);
//   return {
//     ...toRefs(state),
//     doubleCounter,
//     increment,
//   };
// });
