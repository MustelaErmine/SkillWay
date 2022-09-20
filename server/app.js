const { json } = require('body-parser');
const { static } = require('express');

const express = require('express'), fs = require('fs-extra'),
    cookie_parser = require('cookie-parser'),
    session = require('express-session'), MongoStore = require('connect-mongo')(session),
    bodyParser = require('body-parser'), md5 = require('md5'),
    mongoClient = require('mongodb').MongoClient;

var db, organizations, teachers, practice_curators, skills, groups;
var mongo_url = 'mongodb://localhost:27017',
    mongo = mongoClient(mongo_url, { useUnifiedTopology: true }), port = 80;

const app = express();
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const tOrganization = 'organization', tCurator = 'practice-curator', tTeacher = 'teacher';

app.use(urlencodedParser);
app.use(cookie_parser('37b2ca48723f7423c4890127b094883d8190d029'));
app.use(session({
    secret: '9r894ru483ycd348yf834y894882yfd89',
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
        url: mongo_url + '/skillway',
    })
}));
const print = function (args) {
    date = new Date();
    console.log(`[${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}] ${args}`);
} // Function of printing info with time
const unpackDocument = function (name, args) {
    data = fs.readFileSync(`../client/${name}.html`, 'utf-8');
    Object.keys(args).forEach(element => {
        data = data.replace(`{${element}}`, args[element]);
    });
    return data;
} // Function of replacing elements in html documents
const pass_gen = function (len) {
    chrs = '1234567890';
    var str = '';
    for (var i = 0; i < len; i++) {
        var pos = Math.floor(Math.random() * chrs.length);
        str += chrs.substring(pos, pos + 1);
    }
    return str
} // Generate random string
// Middlewares:
function chechAuthorization(type = 'any') {
    if (type == 'any') {
        return function (request, response, next) {
            if (request.session.autorized) {
                next();
            } else {
                var fullUrl = request.protocol + '://' + request.get('host') + request.originalUrl;
                response.redirect('/enter?url=' + encodeURIComponent(fullUrl));
            }
        };
    } else {
        return function (request, response, next) {
            if (request.session.autorized && request.session.usertype == type) {
                next();
            } else {
                var fullUrl = request.protocol + '://' + request.get('host') + request.originalUrl;
                response.redirect('/enter?url=' + encodeURIComponent(fullUrl));
            }
        };
    }
} // For checking whether user authorized in system

app.use('/static', express.static(__dirname + '/../client/static')); // For using static files

print('Initialization...');

mongo.connect(function (err, client) {
    if (err) {
        print(err, ERROR);
        return;
    }
    db = mongo.db('skillway');
    organizations = db.collection('organizations');
    teachers = db.collection('teachers');
    practice_curators = db.collection('practice-curators');
    skills = db.collection('skills');
    groups = db.collection('groups');
    print('MongoDB connection succesfull setted up');
});

app.use(function (request, response, next) {
    print(request.ip + ' ' + request.method + ' ' + request.path);
    next();
}); // Logging

// Authorization
app.get('/', function (request, response) {
    var ent = 'Вы не вошли';
    if (request.session.autorized)
        ent = 'Вы вошли как ' + request.session.username;
    response.end(unpackDocument('index', { entered: ent }));
});
app.get('/test', chechAuthorization(), async function (request, response) {
    var c = await getTeachers('ITM');
    response.end(c);
});
app.post('/login', function (request, response) {
    var tUsername = request.body.username, tPassword = request.body.password;
    if (!tUsername || !tPassword) {
        response.sendStatus(400);
        return;
    }
    var found_users = [];
    // Organizations
    organizations.find({ name: tUsername }).toArray(function (err, results) {
        if (err) {
            response.sendStatus(500);
            print(err);
            return;
        }
        results.forEach((result) => {
            if (md5(tPassword + result.sault) == result.password) {
                result.type = tOrganization;
                found_users.push(result);
            }
        });
        var name, tdomen;
        name = tUsername.split('@')[0];
        tdomen = tUsername.split('@')[1];
        // Teachers
        teachers.find({ username: name, domen: tdomen }).toArray(function (err, results) {
            if (err) {
                response.sendStatus(500);
                print(err);
                return;
            }
            results.forEach((result) => {
                if (md5(tPassword + result.sault) == result.password) {
                    result.type = tTeacher;
                    found_users.push(result);
                }
            });
            // Practice curators
            practice_curators.find({ username: tUsername }).toArray(function (err, results) {
                if (err) {
                    response.sendStatus(500);
                    print(err);
                    return;
                }
                results.forEach((result) => {
                    if (md5(tPassword + result.sault) == result.password) {
                        result.type = tCurator;
                        found_users.push(result);
                    }
                });
                // DOING SOMETHING WITH RESULTS
                if (found_users.length == 0) {
                    // No accounts found
                    response.redirect('/enter?status=' + encodeURIComponent('Не авторизован'));
                    print(request.ip + ' didn\'t authorized');
                    return;
                } else if (found_users.length > 1) {
                    response.sendStatus(500);
                    return;
                } else {
                    request.session.autorized = true;
                    request.session.usertype = found_users[0].type;
                    if (found_users[0].type == tOrganization)
                        request.session.username = found_users[0].name;
                    else
                        request.session.username = found_users[0].username;
                    if (found_users[0].type == tTeacher)
                        request.session.domen = found_users[0].domen;
                    print(request.ip + ' is authorized how ' +
                        request.session.username + ' (an ' + found_users[0].type + ')');
                    if (request.query.url)
                        response.redirect(decodeURIComponent(request.query.url));
                    else
                        response.redirect('/app');
                }
            });
        });
    });
});
app.get('/enter', function (request, response) {
    // Todo: status
    var tquery = '';
    if (request.query.url) {
        tquery = '?url=' + encodeURIComponent(request.query.url);
    }
    var status = request.query.status;
    if (!request.query.status)
        status = '';
    adress = 'localhost';
    response.end(unpackDocument('login', { status: status, query: tquery, adress: adress }));
});
app.get('/logout', function (request, response) {
    print(request.ip + ' is logged out from ' + request.session.username);
    request.session.autorized = false;
    request.session.username = null;
    request.session.usertype = null;
    response.redirect('/');
});

app.get('/app', function (request, response) {
    if (request.session.autorized) {
        var adress = '';
        switch (request.session.usertype) {
            case 'organization':
                adress = '/organization';
                break;
            case 'teacher':
                adress = '/app/teacher';
                break;
            case 'practice-curator':
                adress = '/app/practice-curator';
                break;
            default:
                response.sendStatus(401);
                return;
                break;
        }
        response.redirect(adress);
    } else {
        response.end(unpackDocument('app', {}));
    }
});

// Organiztion page
app.get('/organization', chechAuthorization(tOrganization), async function (request, response) {
    var masters = await getTeachers(request.session.username);
    var comps_tree = await getWays(request.session.username);
    var grps = await getGroups(request.session.username);
    grps = JSON.stringify(grps);
    response.end(unpackDocument('organization',
        {
            masters: masters,
            competentionss_tree: comps_tree,
            groups: grps
        }
    ));
});
async function getTeachers(dom) {
    var results = await teachers.find({ domen: dom }).toArray();
    var masters = [];
    for (var teacher of results) {
        var comp = await skills.findOne({ id: teacher.competention });
        var groups_names = '';
        var this_groups = await groups.find({ teachers: teacher.username }).toArray();
        this_groups.forEach(function (group) {
            groups_names += group.name + ', ';
        });
        if (groups_names.length >= 2)
            groups_names = groups_names.substr(0, groups_names.length - 2);
        masters.push({
            display_name: teacher.display_name,
            username: teacher.username,
            competention: comp.name,
            groups_names: groups_names
        });
    }
    return JSON.stringify(masters);
} // Get teachers of this organization
async function getWays(dom) {
    var all_skills = await skills.find({ domen: dom }).toArray();
    var ids = {};
    for (var i = 0; i < all_skills.length; i++)
        ids[all_skills[i].id] = all_skills[i].name;
    var output = normalizeTree(all_skills);
    return JSON.stringify([output, ids]);
} // Get ways of domen
function normalizeTree(array, parent = -1) {
    var ways = array.filter(way => way.parent == parent);
    if (ways.length == 0)
        return {};
    var output = {};
    ways.forEach(way => {
        output[way.id] = normalizeTree(array, way.id);
    });
    return output;
}
async function getNewSkillsTree(id, parent = -1, depth = 0) {
    var skill = await skills.findOne({ id: id }, { projection: { name: 1 } });
    var new_id = pass_gen(8);
    var tskills = [{ id: new_id, parent: parent, name: skill.name, depth: depth }];
    var kids = await skills.find({ parent: id }, { projection: { id: 1 } }).toArray();
    for (const kid of kids) {
        var kids_trees = await getNewSkillsTree(kid.id, new_id, depth + 1);
        for (const tree of kids_trees) {
            tskills.push(tree);
        }
    }
    return tskills;
} // Get full skills tree for adding
async function searchSkills(row) {
    var re = new RegExp('.*' + row + '.*', 'gmui');
    var skill1 = await skills.find({ name: re, depth: 0 }).toArray();
    var skill = [];
    for (var i = 0; i < skill1.length; i++) {
        var s = skill1[i];
        var org_name = await organizations.findOne({ name: s.domen });
        org_name = org_name.display_name;
        skill.push({ name: s.name, id: s.id, organization: org_name });
    }
    return skill;
} // Find all skills by row
async function getGroups(dom) {
    var results = await groups.find({ domen: dom }).toArray();
    var groupss = [];
    for (var res of results) {
        delete res._id;
        delete res.domen;
        groupss.push(res);
    }
    return groupss;
} // Get groups of this organization
function getKeys(arr) {
    var keys = Object.keys(arr);
    var ikeys = keys.slice(0, keys.length);
    for (var key of ikeys) {
        var nkeys = getKeys(arr[key]);
        for (const nkey of nkeys) {
            keys.push(nkey);
        }
    }
    return keys;
} // Get all keys of everydeep set

app.get('/org/teacher', chechAuthorization(tOrganization), async function (request, response) {
    var text = await getTeachers(request.session.username);
    response.end(text);
});
app.put('/org/teacher', chechAuthorization(tOrganization), async function (request, response) {
    if (!request.body.display_name || !request.body.username || !request.body.competention) {
        response.sendStatus(400);
        return;
    }
    var sault = pass_gen(32);
    var password = md5(request.body.password + sault);
    await teachers.insertOne({
        display_name: request.body.display_name,
        username: request.body.username,
        competention: request.body.competention,
        domen: request.session.username,
        password: password,
        sault: sault
    });
    response.end('ok');
});
app.delete('/org/teacher', chechAuthorization(tOrganization), async function (request, response) {
    if (!request.body.username) {
        response.sendStatus(400);
        return;
    }
    var teacher = await teachers.findOne({ username: request.body.username });
    if (teacher.domen != request.session.username) {
        response.sendStatus(401);
        return;
    }
    await teachers.deleteOne(
        {
            username: request.body.username,
            domen: request.session.username
        }
    );
    response.end('ok');
});

app.get('/org/ways', chechAuthorization(tOrganization), async function (request, response) {
    var ways = await getWays(request.session.username);
    response.end(ways);
});
app.put('/org/ways', chechAuthorization(tOrganization), async function (request, response) {
    if (!request.body.parent || !request.body.name) {
        response.end(400);
        return;
    }
    var depth = 0;
    if (request.body.parent != -1) {
        var parent = await skills.findOne(
            {
                id: request.body.parent
            });
        depth = parent.depth + 1;
    }
    var nid = pass_gen(8);
    await skills.insertOne(
        {
            domen: request.session.username,
            id: nid,
            parent: request.body.parent,
            name: request.body.name,
            depth: depth
        });
    response.end(nid);
})
app.delete('/org/ways', chechAuthorization(tOrganization), async function (request, response) {
    if (!request.body.id) {
        response.end(400);
        return;
    }
    var way = await skills.findOne({ id: request.body.id });
    if (way.domen != request.session.username) {
        response.end(400);
        return;
    }
    await skills.deleteOne({ id: request.body.id });
    response.end('ok');
});
app.get('/org/search-skills', chechAuthorization(tOrganization), async function (request, response) {
    var skill = await searchSkills(request.query.row);
    response.end(JSON.stringify(skill));
});
app.copy('/org/ways', chechAuthorization(tOrganization), async function (request, response) {
    var skil = await getNewSkillsTree(request.query.id);
    for (const skill of skil) {
        await skills.insertOne(
            {
                id: skill.id,
                domen: request.session.username,
                parent: skill.parent,
                name: skill.name
            });
    }
    response.end('ok');
});

app.get('/org/groups', chechAuthorization(tOrganization), async function (request, response) {
    var text = await getGroups(request.session.username);
    text = JSON.stringify(text);
    response.end(text);
});
app.put('/org/groups', chechAuthorization(tOrganization), async function (request, response) {
    if (!request.body.name) {
        response.sendStatus(400);
        return;
    }
    await groups.insertOne({
        name: request.body.name,
        domen: request.session.username,
        teachers: [],
        students_numbers: [],
        students: {}
    });
    response.end('ok');
});
app.put('/org/students', chechAuthorization(tOrganization), async function (request, response) {
    if (!request.body.group || !request.body.name) {
        response.sendStatus(400);
        return;
    }
    var id = pass_gen(16);
    if (request.body.id && request.body.id != '') {
        id = request.body.id;
    }
    var ogroups = await groups.find({ students_numbers: request.body.id }).toArray();
    if (ogroups.length == 0)
        id = pass_gen(16);
    var group = await groups.findOne({
        name: request.body.group,
        domen: request.session.username
    });
    var teacher = await teachers.findOne({ username: group.teachers[0] });
    var competention = await getWays(request.session.username);
    var competention = JSON.parse(competention)[0][teacher.competention];
    var keys = getKeys(competention);
    keys.unshift(teacher.competention);
    var new_students = group.students;
    var new_skills = {};
    for (const key of keys) {
        new_skills[key] = -1;
    }
    new_students[id] = { name: request.body.name, skills: new_skills };
    await groups.updateOne({
        name: request.body.group,
        domen: request.session.username
    }, {
        $push: {
            students_numbers: id
        },
        $set: {
            students: new_students
        }
    });
    response.end('ok');
});
app.patch('/org/groups', chechAuthorization(tOrganization), async function (request, response) {
    if (!request.body.newTeacher || !request.body.group) {
        response.sendStatus(400);
        return;
    }
    await groups.updateOne({
        domen: request.session.username,
        name: request.body.group
    }, {
        $push: {
            teachers: request.body.newTeacher
        }
    });
    response.end('ok');
});
app.delete('/org/groups', chechAuthorization(tOrganization), async function (request, response) {
    if (!request.body.name) {
        response.sendStatus(400);
        return;
    }
    await groups.deleteOne({
        name: request.body.name,
        domen: request.session.username
    });
    response.end('ok');
});
app.delete('/org/students', chechAuthorization(tOrganization), async function (request, response) {
    if (!request.body.id) {
        response.sendStatus(400);
        return;
    }
    var group = await groups.findOne({
        students_numbers: request.body.id
    });
    var new_students = group.students;
    delete new_students[request.body.id];
    await groups.updateOne({
        students_numbers: request.body.id
    }, {
        $pull: {
            students_numbers: request.body.id
        },
        $set: {
            students: new_students
        }
    });
    response.end('ok');
});

app.get('/app/teacher', chechAuthorization(tOrganization), function (request, response) {
    response.end('<h1>APP TEACHER</h1>');
});
app.get('/app/practice-curator', chechAuthorization(tOrganization), function (request, response) {
    response.end('<h1>APP PRACTICE CURATOR</h1>');
});
app.get('/app/employer', chechAuthorization(tOrganization), function (request, response) {
    response.end('<h1>Employer\'s app</h1>');
});
app.get('/app/parent', chechAuthorization(tOrganization), function (request, response) {
    response.end('<h1>Parent\'s app</h1>');
});
app.listen(port = port, callback = function () {
    print('Server started on port ' + port);
});