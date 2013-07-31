var typedef = require('typedef');

module.exports = Table = typedef

// Base class for an infusionsoft table. 'field' decoration indicates a field
// value scraped from the API docs
.class('Table') .define({

    __ondefine__: function(C, hash)
    {
        var FIELDS = [];
        _(typedef.signature(C)).each(function(info, key) {
            if (info.decorations.FIELD)
                FIELDS.push(key);
        });

        if (FIELDS.length)
            C.FIELDS = FIELDS;
    },

});
