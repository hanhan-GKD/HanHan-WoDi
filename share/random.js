function RAND() {
    this._luckys = [];
    this._counts = [];
    this._total = 0;
    this._count = 0;
    this._inc_counts = function (pos) {
        this._counts[pos]++
        this._count++
    }

    this._reset_counts = function () {
        this._counts = [];
        this._count = 0;
        for (let i = 0; i < this._luckys.length; i++) {
            this._counts[i] = 0;
        }
    }

    this._find_one_counter = function () {
        for (let i = 0; i < this._counts.length; i++) {
            if (this._counts[i] < this._luckys[i]) {
                return i;
            }
        }
        return -1;
    }
    this.init = function (luckys) {
        this._luckys = luckys.concat();
        let total = 0
        for (let i in luckys) {
            total += luckys[i]
        }
        this._total = total
        //console.log(`total is ${_total}`)
        this._reset_counts()
    }
    /*return :  -1 错误，
    *          >=0 正确,返回选中的下标
    * */
    this.rand = function () {
        if (this._total == 0) {
            return -1;
        }
        //console.log(`count=${_count}`)
        if (this._count == this._total) {
            this._reset_counts();
        }
        let rand_pos = Math.floor(Math.random() * (this._total - this._count))
        // console.log("===随机选中>", _total, rand_pos)
        let pos = -1;
        for (let i = 0; i < this._luckys.length; i++) {
            rand_pos -= (this._luckys[i] - this._counts[i])
            if (rand_pos < 0) {
                // console.log("===随机选中>", i)
                pos = i;
                break;
            }
        }
        // console.log(`first pos=${pos}, count=${_counts[pos]}, lucky=${_luckys[pos]}`)
        if (this._counts[pos] < this._luckys[pos]) {
            // console.log("选中位置未满")
            this._inc_counts(pos)
        } else {
            // console.log("选中位置已满")
            pos = this._find_one_counter()
            if (pos < 0) {
                //_reset_counts()
            } else {
                this._inc_counts(pos)
            }
        }
        //console.log(`selected pos=${pos}`)

        return pos;
    }
    //获取当前总和
    this.getCurrentCount = function () {
        return this._count;
    }
}

module.exports = RAND;
