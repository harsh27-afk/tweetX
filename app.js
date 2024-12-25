const express=require("express")
const app=express();

const user=require("./models/user");
const post=require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken")

app.set("view engine","ejs")
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser())

app.get("/",(req,res)=>{
    res.render("index")
})

app.post("/register",async(req,res)=>{
    const{name,username,password,age,email}=req.body;

    // check if an account has already been created witht hat email
    let theUser=await user.findOne({email:email})
    if(theUser) return res.status(303).send("User already registered with this email id")

    // hash the password and save in the database
        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(password, salt, async function(err, hash) {
                let theUser=await user.create({
                    name:name,
                    username:username,
                    password:hash,
                    email:email,
                    age:age
                })
                let token=jwt.sign({email:email, userid:theUser._id},"secret key")
                res.cookie("token",token);
                res.render("profile",{currentUser:theUser})
            });
        });

})

app.get("/login",(req,res)=>{
    res.render("login");
})

app.post("/login",async (req,res)=>{
    let{email,password}=req.body;

    let theUser= await user.findOne({email:email});
    if(!theUser) return res.send("no useer with that email account")

        bcrypt.compare(password, theUser.password, function(err, result) {
            if(result){
                let token=jwt.sign({email:email,userid:theUser._id },"secret key")
                res.cookie("token",token);
                res.render("profile",{currentUser:theUser})
                
            }
        });

       
})

app.get("/logout",(req,res)=>{
    res.cookie("token","")
    res.render("login")
})

app.get("/profile",isLoggedIn,async (req,res)=>{
    const theUser= await user.findOne({email:req.asliUser.email}).populate("posts")
    // the populate function actually, brings the whole object of the
    //  corresponding post _id
   
    res.render("profile",{currentUser:theUser})
})


// ye wala middleware protected routes pe lagaoo like /profile n all
function isLoggedIn(req,res,next){
    if(req.cookies.token=="") res.send("u must be logged in");
    else{
        let data=jwt.verify(req.cookies.token,"secret key");
        req.asliUser=data;  // we are appending an object to req object
        // console.log(req.asliUser)
        next();
    }
   
}

app.post("/post",isLoggedIn,async (req,res)=>{
    let{content}=req.body;
    let theUser=await user.findOne({email:req.asliUser.email});

    let createdPost=await post.create({
        user:theUser._id,
        content:content
    })

    theUser.posts.push(createdPost._id);
    await theUser.save(); // need to do this cause we are manually changing data of a model
    res.redirect("/profile")
})

app.listen(3000,()=>{
    console.log("server started on port 3000")
})