// ==========================================================================
// КОМПОНЕНТ ВЫБОРА ПРИПРЕССА И ЛАМИНАЦИИ С ПОИСКОМ И ВЫБОРОМ СТОРОН (1+0 / 1+1)
// ==========================================================================

Vue.component('lamination-selector', {
    props: {
        value: { 
            type: String, 
            default: 'none' 
        },
        sides: { 
            type: String, 
            default: '1_0' 
        },
        laminations: { 
            type: Object, 
            default: function() { 
                return (typeof APP_LAMINATIONS !== 'undefined') ? APP_LAMINATIONS : {}; 
            } 
        },
        onlySingleSide: { 
            type: Boolean, 
            default: false 
        },
        disabled: { 
            type: Boolean, 
            default: false 
        }
    },
    data: function() {
        return {
            query: '',
            isOpen: false
        };
    },
    computed: {
        lamList: function() {
            if (this.laminations && Object.keys(this.laminations).length > 0) {
                return this.laminations;
            }
            return (typeof APP_LAMINATIONS !== 'undefined') ? APP_LAMINATIONS : {};
        },
        filteredLaminations: function() {
            let search = (this.query || '').trim().toLowerCase();
            let list = this.lamList;
            let result = {};
            
            // Если текст в строке совпадает с уже выбранным элементом — при фокусе показываем весь список
            let currentText = '';
            if (this.value && list[this.value]) {
                currentText = (list[this.value].name + (list[this.value].price ? ' (' + list[this.value].price + ' тг)' : '')).toLowerCase();
            }
            let isCurrentSelected = (search === currentText) || (this.value === 'none' && search === (list['none'] ? list['none'].name.toLowerCase() : ''));

            for (let key in list) {
                let item = list[key];
                let str = (item.name + ' ' + (item.price || '')).toLowerCase();
                if (isCurrentSelected || !search || str.includes(search)) {
                    result[key] = item;
                }
            }
            return result;
        },
        canChooseSides: function() {
            // Кнопки 1+0 / 1+1 отображаются только для рулонного припресса (roll).
            // Для "Без покрытия", пакетной ламинации (pouch) или изделий вроде пакетов/наклеек они скрыты.
            if (this.onlySingleSide || this.disabled) return false;
            if (!this.value || this.value === 'none') return false;
            let lam = this.lamList[this.value];
            if (!lam) return false;
            return lam.type === 'roll';
        }
    },
    watch: {
        value: {
            immediate: true,
            handler: function() {
                this.syncQueryWithVal();
            }
        },
        laminations: {
            deep: true,
            handler: function() {
                this.syncQueryWithVal();
            }
        }
    },
    template: `
    <div class="lamination-selector-container" style="position: relative; z-index: 10;">
        <div class="input-group input-group-sm">
            <input type="text" 
                   class="form-control form-control-sm bg-white" 
                   v-model="query" 
                   :disabled="disabled"
                   @focus="openDropdown" 
                   @blur="blurLamination" 
                   placeholder="Поиск ламинации...">

            <!-- Переключатель 1+0 / 1+1 (виден только если выбран рулонный припресс) -->
            <div class="input-group-append" v-if="canChooseSides">
                <button type="button" 
                        class="btn btn-sm font-weight-bold" 
                        :class="sides === '1_0' ? 'btn-primary' : 'btn-outline-secondary'"
                        :disabled="disabled"
                        @mousedown.prevent="setSides('1_0')">1+0</button>
                <button type="button" 
                        class="btn btn-sm font-weight-bold" 
                        :class="sides === '1_1' ? 'btn-primary' : 'btn-outline-secondary'"
                        :disabled="disabled"
                        @mousedown.prevent="setSides('1_1')">1+1</button>
            </div>
        </div>

        <!-- Выпадающий список совпадений -->
        <div class="dropdown-menu show-custom shadow-sm" v-show="isOpen">
            <a class="dropdown-item d-flex justify-content-between align-items-center py-1 px-2" 
               href="#" 
               v-for="(item, key) in filteredLaminations" 
               :key="key" 
               :class="{'active': value === key}"
               @mousedown.prevent="selectLamination(key)">
                <span>{{ item.name }}</span>
                <small :class="value === key ? 'text-white' : 'text-muted'" v-if="item.price > 0">
                    {{ item.price }} тг
                </small>
            </a>
        </div>
    </div>
    `,
    methods: {
        syncQueryWithVal: function() {
            let list = this.lamList;
            if (this.value && list && list[this.value]) {
                let item = list[this.value];
                if (this.value === 'none') {
                    this.query = item.name;
                } else {
                    this.query = item.name + (item.price ? ' (' + item.price + ' тг)' : '');
                }
            } else {
                this.query = 'Без припресса / ламинации';
            }
        },
        openDropdown: function(e) {
            this.isOpen = true;
            if (e && e.target && e.target.select) {
                e.target.select();
            }
        },
        selectLamination: function(key) {
            this.$emit('input', key);
            this.isOpen = false;
            
            let item = this.lamList[key];
            // При сбросе на "none" или выборе пакетной ламинации возвращаем сторонность на 1_0
            if (key === 'none' || (item && item.type !== 'roll')) {
                this.$emit('update:sides', '1_0');
            }
            this.syncQueryWithVal();
        },
        setSides: function(side) {
            this.$emit('update:sides', side);
        },
        blurLamination: function() {
            setTimeout(() => {
                this.isOpen = false;
                this.syncQueryWithVal();
            }, 200);
        }
    }
});