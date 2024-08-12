const mongoose = require('mongoose');

mongoose.connect(`mongodb://localhost:27017/SocialLink`)

const userSchema = mongoose.Schema({
    username: String,
    name: String,
    email: String,
    password: String,
    age: Number,
    posts:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'post'
        }
    ],
    profilepic:{
        type:String,
        default:"default.jpg"
    }

})

module.exports = mongoose.model('user', userSchema);