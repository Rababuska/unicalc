// ==========================================================================
// КОМПОНЕНТ ВЫБОРА БУМАГИ С ЖИВЫМ ПОИСКОМ (components/paper-selector.js)
// ==========================================================================

Vue.component('paper-selector', {
    props: ['value', 'papers', 'isSticker', 'isBag'],
    data: function() {
        return {
            query: '',
            isOpen: false
        };
    },
    computed: {
        filteredPapers: function() {
            let search = (this.query || '').toLowerCase();
            let result = {};
            for (let key in this.papers) {
                if (this.isSticker && key !== 'p36' && key !== 'p37') continue;
                if (this.isBag) {
                    let p = this.papers[key];
                    let maxL = Math.max(p.w, p.h);
                    let minL = Math.min(p.w, p.h);
                    if (maxL < 488 || minL < 330) continue;
                }
                let str = (this.papers[key].name + ' (' + this.papers[key].price + ' тг)').toLowerCase();
                if (str.includes(search)) result[key] = this.papers[key];
            }
            return result;
        }
    },
    watch: {
        value: {
            immediate: true,
            handler: function(newVal) {
                if (newVal === 'custom') {
                    this.query = '--- Свой вариант ---';
                } else if (this.papers && this.papers[newVal]) {
                    this.query = this.papers[newVal].name + ' (' + this.papers[newVal].price + ' тг)';
                } else {
                    this.query = '';
                }
            }
        }
    },
    template: `
    <div style="position: relative; z-index: 10;">
        <input type="text" class="form-control form-control-sm" v-model="query" 
               @focus="isOpen = true; $event.target.select()" 
               @blur="blurPaper" placeholder="Поиск бумаги...">
        <div class="dropdown-menu show-custom shadow-sm" v-show="isOpen">
            <a v-if="!isSticker" class="dropdown-item font-weight-bold text-primary bg-light" href="#" @mousedown.prevent="selectPaper('custom')">
                --- Свой вариант ---
            </a>
            <a class="dropdown-item" href="#" v-for="(item, key) in filteredPapers" :key="key" @mousedown.prevent="selectPaper(key)">
                {{ item.name }} ({{ item.price }} тг)
            </a>
        </div>
    </div>
    `,
    methods: {
        selectPaper: function(key) {
            this.$emit('input', key);
            this.isOpen = false;
        },
        blurPaper: function() {
            setTimeout(() => {
                this.isOpen = false;
                if (this.value === 'custom') {
                    this.query = '--- Свой вариант ---';
                } else if (this.papers && this.papers[this.value]) {
                    this.query = this.papers[this.value].name + ' (' + this.papers[this.value].price + ' тг)';
                }
            }, 200);
        }
    }
});