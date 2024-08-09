const express = require('express')
const bcrypt = require('bcrypt')
const app = express();
const path = require('path');
const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const upload = require('./config/multerconfig')


app.set("view engine", "ejs");
app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')))


app.get('/', (req, res) => {
    res.render("index");
})
app.post('/register', async (req, res) => {
    let { name, username, age, email, password } = req.body;
    let user = await userModel.findOne({ email })
    if (user) return res.render("accountFailure");

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await userModel.create({
                name,
                username,
                age,
                email,
                password: hash
            })
            let token = jwt.sign({ email: email, userid: user._id }, "secretKey");
            res.cookie("token", token );
            res.redirect("/profile");

        })
    })
})

app.get('/login', (req, res) => {
    res.render("login")
})

app.post("/login", async (req, res) => {
    let { email, password } = req.body;

    let user = await userModel.findOne({ email });
    if (!user) return res.status(500).redirect("/login")

    bcrypt.compare(req.body.password, user.password, (err, result) => {
        if (result) {

            let token = jwt.sign({ email: email, userid: user._id }, "secretKey");
            res.cookie("token", token)
            res.redirect("/profile")
        }
        else {
            res.redirect("/login");

        }
    })
})
app.get('/logout', (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
});
app.get('/profile' , isLoggedin ,async (req,res)=>{
    let user = await userModel.findOne({email:req.user.email})
    await user.populate("posts");
    res.render("profile" ,{user});
});
function isLoggedin(req, res, next) {
    if (req.cookies.token === "") res.redirect("/login")
    else {
        let data = jwt.verify(req.cookies.token, "secretKey")
        req.user = data;
        next();
    }

}
app.post("/create" ,isLoggedin , async (req,res)=>{
    let user = await userModel.findOne({email:req.user.email})
    let {content} = req.body;
    let post = await postModel.create({
        user:user._id,
        content
    })
    
    
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");

})
app.get("/like/:id", isLoggedin,async(req,res)=>{
    let post = await postModel.findOne({_id:req.params.id}).populate("user");
    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid)
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1)
    }
    await post.save();
    res.redirect("/profile");
})

app.get('/edit/:id' ,async (req,res)=>{
    let post = await postModel.findOne({_id:req.params.id}).populate("user");
    res.render("edit" ,{post});
})

app.post("/update/:id" ,async (req,res)=>{
    let post = await postModel.findOneAndUpdate({_id:req.params.id} ,{content:req.body.content});
    res.redirect("/profile")

})
app.get("/profile/upload" ,(req,res)=>{
    res.render("profileupload")
})
app.post("/upload" ,upload.single("image") ,isLoggedin , async (req,res)=>{
    let user = await userModel.findOne({email:req.user.email});
    user.profilepic= req.file.filename;
    await user.save();
    res.redirect("/profile")
})
app.get("/allposts"  , isLoggedin , async (req , res)=>{
    let curruser = await userModel.findOne({email:req.user.email})
    const allposts = await postModel.find().populate("user");
    res.render("posts" ,{allposts ,curruser});
})
app.get("/likepost/:postid/:userid", isLoggedin,async(req,res)=>{
    let post = await postModel.findOne({_id:req.params.postid}).populate("user");
    if(post.likes.indexOf(req.params.userid) === -1){
        post.likes.push(req.params.userid)
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1)
    }
    await post.save();
    res.redirect("/allposts");
})
app.get("/delete/:id" , async (req,res)=>{
    let deletedpost = await postModel.findOneAndDelete({_id:req.params.id})
    res.redirect("/profile");
}) 
app.listen(3000);