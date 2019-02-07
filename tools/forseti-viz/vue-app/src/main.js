import Vue from 'vue'
import './plugins/vuetify'
import VueRouter from 'vue-router'

import App from './App.vue'

import Footer from './components/Footer'
import Bar from './components/Bar'
Vue.use(VueRouter);
const routes = [
  { path: '/foo', component: Footer },
  { path: '/bar', component: Bar }
]

Vue.config.productionTip = false
Vue.config.runtimeCompiler = true

const router = new VueRouter({
  routes
});

new Vue({
  router,
  render: h => h(App),
}).$mount('#app')