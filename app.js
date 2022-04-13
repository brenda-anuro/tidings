const express = require('express')
const mysql = require('mysql')
const bcrypt = require('bcrypt')
const session = require('express-session')

const app = express()

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tidings'
})

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({extended: false}))

app.use(session({
    secret: 'elections',
    resave: false,
    saveUninitialized: false

}))

app.use((req, res, next)=>{
    if(req.session.userId === undefined){
        res.locals.isLoggedIn = false
    }else{
        res.locals.isLoggedIn = true
        res.locals.userId = req.session.userId
        res.locals.username = req.session.username
    }
    next()
})


app.get('/', (req,res)=>{
    res.render('home.ejs')
})

app.get('/about', (req, res)=>{
    res.render('about-us.ejs')
})




app.get('/login', (req, res)=>{
    let user ={
        email: '',
        password: '',
    }
        res.render('login.ejs', {error:false, user:user})
})
app.post('/login',(req,res)=>{
    let user ={
        email: req.body.email,
        password: req.body.password
    }
   connection.query(
       'SELECT * FROM users WHERE email =?', [user.email],
       (error,results)=> {
           if(results.length > 0){
               bcrypt.compare(user.password, results[0].password,(error, isEqual)=>{
                   if(isEqual){
                       req.session.userId = results[0].id
                       req.session.username = results[0].fullname.split(' ')[0].toLowerCase()
                      
                        res.redirect('/tyds')
                   }else{
                       let message = 'email/password mismatch.'
                       res.render('login.ejs', {error:true, message:message, user:user})
                   }
               })

           }else{
               let message = 'Account does not exist. Please create an account'
               res.render('login.ejs', {error:true, message:message, user:user})
           }
       }
   ) 


})


 app.get('/signup', (req,res)=>{
   let user = {
       email: '',
       fullname: '',
       gender: '',
       password: '',
       confirmPassword: '',

   }
    res.render('signup.ejs', {
        error: false, user: user
    })
})
app.post('/signup',(req,res)=>{
    let user = {
        email: req.body.email,
        fullname: req.body.fullname,
        gender: req.body.gender,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword
    }

    if (user.password === user.confirmPassword){
        connection.query(
            'SELECT email FROM users WHERE email = ?', [user.email],
            (error, results)=>{
                if(results.length === 0){
                    bcrypt.hash(user.password,10, (error,hash)=>{
                        connection.query(
                            'INSERT INTO users (email,fullname,gender,password) VALUES (?,?,?,?)',
                            [user.email, user.fullname, user.gender, hash],
                            (error,results)=>{
                                res.redirect('/')
                            }           
                        )
                    })
                }else {
                    let message = 'email already exists.'
                    res.render('sigup.ejs',{error:true, message:message, user:user})
                }
            }
        )

    }else{
        let message = 'Password and Confirm password does not match'
        console.log(user)
        res.render('signup.ejs', {error:true, message:message, user:user})
    }


})

app.get('/new-tyd', (req,res)=>{
   if(res.locals.isLoggedIn){
    res.render('new-tyd.ejs')
   }else{
       res.redirect('/login')
   }
})

app.post('/new-tyd',(req,res)=>{
 connection.query(
     'INSERT INTO tyds (tyd, userid) VALUES (?,?)',
     [req.body.tyd, req.session.userId],
     (error, results)=>{
         res.redirect('/tyds')

     }
 )


})
app.get('/tyds', (req, res)=>{
    if(res.locals.isLoggedIn){
        connection.query(
            'SELECT fullname, tyds.id AS tydID, tyd, likes, dateposted FROM tyds JOIN users ON tyds.userid = users.id ORDER BY dateposted DESC',
            (error, results)=>{
                res.render('tyds.ejs', {tyds: results})
            }
        )
    }else{
        res.redirect('/login')
    }
})


app.post('/like/:id',(req,res)=>{
    connection.query(
        'SELECT * FROM likes WHERE tydId =?',
        [parseInt(req.params.id)],
        (error,results)=> {
            if(results.length > 0){
                connection.query(
                    'DELETE FROM likes WHERE tydId = ? AND userId = ?',
                    [parseInt(req.params.id), req.session.userId],
                    (error,results)=>{
                        connection.query(
                            'UPDATE tyds SET likes = likes -1 WHERE id = ?',
                            [parseInt(req.params.id)],
                            (error,results)=>{
                                res.redirect('/tyds')
                            }
                        )
                    }
                )

            }else{
                connection.query(
                    'INSERT INTO likes (tydId,userid) VALUES (?,?)',
                    [parseInt(req.params.id), req.session.userId],
                    (error,results)=>{
                            connection.query (
                                'UPDATE tyds SET likes = likes + 1 WHERE id = ?',
                                [parseInt(req.params.id)],
                                (error,results)=>{
                                    res.redirect('/tyds')
                                }
                            )
                    }
                )
            }
        }
    )
})


// app.post('/updatelikes', (req, res) => {
//     let tydId = parseInt(req.query.tydId)
//     let userID = parseInt(req.query.userID)
//     console.log(userID)
//     console.log(tydId)
//     connection.query(
//         'SELECT * FROM likes WHERE tydId= ? AND userID=?',
//         [tydId,userID],
//         (error, likes) => {
//             if(error){
//                 console.log(error)
//             } else {
//                 if(likes.length > 0) {
//                     // remove from db
//                     connection.query(
//                         'DELETE FROM likes WHERE tydId =? AND userID =?',
//                         [tydId, userID],
//                         (error, results) => {
//                             console.log('like deleted from db')
//                             res.redirect('/tyds')
//                         }
//                     )
//                 } else {
//                     connection.query(
//                         'INSERT INTO likes (tydId, userID) VALUES(?,?)',
//                         [tydId, userID],
//                         (error, results) => {
//                             if(error){
//                                 console.log(error)
//                             } else {
//                                 console.log('likes updated')
//                                 res.redirect('/tyds')
//                             }
//                         }
//                     )
//                 }
                
//             }
//         }
//     )

// });





app.get('/logout', (req,res)=>{
    res.session.destroy((error)=>{
        res.redirect('/')
    })
}) 
                
                
const PORT = process.env.PORT || 3000
app.listen(PORT, ()=>{
    console.log(`Server up on PORT ${PORT}`)
})