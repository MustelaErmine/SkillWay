console.log('Scripts setted up successfuly');
var url_prefix = 'http://localhost';
let opened_competitions_ids = {0: -1};

let opened_group = '-1';
const pass_gen = function(len) {
    chrs = '123456789abcdef';
    var str = '';
    for (var i = 0; i < len; i++) {
        var pos = Math.floor(Math.random() * chrs.length);
        str += chrs.substring(pos,pos+1);
    }
    return str
} // Generate random string
function deleteTeacher (username) {
    var request = new XMLHttpRequest();
    request.open('DELETE', url_prefix + '/org/teacher');
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    request.send('username='+username);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            updateTeacher();
        }
    };
}
function updateTeacher () {
    var table = document.getElementById('teachers-body');
    var request = new XMLHttpRequest();
    request.open('GET', url_prefix + '/org/teacher');
    request.send();
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            teachers = JSON.parse(request.responseText);
            setTeacher();
        }
    };
}
function setTeacherFoot () {
    var keys = Object.keys(_tree);
    var inner = ""
    for (key of keys){
        var value = names[key];
        inner += '<option value="'+key+'">'+value+'</option>';
    }
    new_teacher.teacher_competention.innerHTML = inner;
}
function setTeacher() {
    var masters = "";
    for (var teacher of teachers){
        masters += '<tr>';
        masters += '<td>'+teacher.display_name+'</td>';
        masters += '<td>'+teacher.username+'</td>';
        masters += '<td>'+teacher.competention+'</td>';
        masters += '<td>'+teacher.groups_names+'</td>';
        //masters += '<td><button onclick="deleteTeacher(\''+teacher.username+'\')">-</button></td>';
        masters += '</tr>';
    }
    document.getElementById('teachers-body').innerHTML = masters;
    setGroupsFoot();
}
function addTeacher (display_name, username, competention) {
    var request = new XMLHttpRequest();
    request.open('PUT', url_prefix + '/org/teacher');
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    request.send('username=' + username + 
                 '&display_name=' + display_name + 
                 '&competention='+competention);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            updateTeacher();
        }
    };
}
function searchSkills(row) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            var s = '';
            var skills = JSON.parse(request.responseText);
            skills.forEach(skill => {
                s += '<tr>';
                s += '<td>' + skill.id + '</td>';
                s += '<td>' + skill.name + '</td>';
                s += '<td>' + skill.organization + '</td>';
                s += '</tr>';
            });

            document.getElementById('search-table').innerHTML = s;
        }
    };
    request.open('GET', url_prefix + '/org/search-skills?row=' + encodeURIComponent(row));
    request.send();
}
function copyCompetition(id) {
    var request = new XMLHttpRequest();
    request.open('COPY', url_prefix + '/org/ways?id=' + id);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            setTimeout(() => {updateCompetitions();}, 1000);
        }
    }
    request.send();
}
function openCompetition(id) {
    var com = findCompetition(id);
    var tree = com[0], depth = com[1];
    try {
        document.getElementById('c' + opened_competitions_ids[depth + 1]).className = '';
    } catch {}
    opened_competitions_ids[depth + 1] = id;
    document.getElementById('c' + id).className = 'focused';
    for (var i = depth + 2; i < 99; i++) {
        delete opened_competitions_ids[i];
    }
    writeTree(tree, depth + 1);
}
function writeTree(tree, depth) {
    if (tree == undefined)
        return;
    var element = document.getElementById('depth_' + depth), new_inner;
    if (element == undefined) { // Append to inner of div
        var new_inner = '<ul class="competentions" id="depth_' + depth + '">';
    } else { // Write to element
        var new_inner = '';
    }

    var keys = Object.keys(tree);
    for (const key of keys) {
        new_inner += '<li onclick="openCompetition(\'' + key + '\');" id="c' + key + '">';
        new_inner += names[key];
        //new_inner += '<button onclick="deleteSkill(\''+key+'\')">X</button>';
        new_inner += '</li>';
    }
    var inptId = pass_gen(8);
    new_inner += '<li style="list-style:none; margin-top: 20px;"><input type="text" id="'+inptId+'" style="display: inline-block;"><button onclick="var nName = document.getElementById(\''+inptId+'\').value; createSkill(nName, opened_competitions_ids['+depth+']);">Добавить</button></li>';

    if (element == undefined) {
        new_inner += '</ul>';
        competentions_div.innerHTML += new_inner;
    } else {
        element.innerHTML = new_inner;

        for (var i = depth + 1; i < 99; i++) {
            var del_element = document.getElementById('depth_' + i);
            if (del_element != undefined)
                del_element.innerHTML = "";
        }
    }
}
function findCompetition(id, tree=_tree, depth=0) {
    var keys = Object.keys(tree);
    var found = keys.find((el) => el==id, keys);
    if (found != undefined) 
        return [tree[id], depth];
    var found = -1;
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (tree[key] != {}) {
            var tfound = findCompetition(id, tree[key], depth + 1);
            if (tfound != -1) {
                found = tfound;
                break;
            }
        }
    }
    return found;
}
function updateCompetitions(reorder=false) {
    var request = new XMLHttpRequest();
    request.open('GET', url_prefix + '/org/ways');
    request.send();
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            raw = JSON.parse(request.responseText);
            _tree = raw[0], names = raw[1];
            writeTree(_tree, 0);
            if (reorder) {
                for (const key of Object.keys(opened_competitions_ids).sort().slice(1)) {
                    openCompetition(opened_competitions_ids[key]);
                }
            }
            setTeacherFoot();
        }
    };
}
function createSkill(name, parent) {
    var request = new XMLHttpRequest();
    request.open('PUT', url_prefix + '/org/ways');
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    request.send('name=' + name + 
                 '&parent=' + parent);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            updateCompetitions(true);
        }
    };
}
function deleteSkill(id) {
    var request = new XMLHttpRequest();
    request.open('DELETE', url_prefix + '/org/ways');
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    request.send('id=' + id);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            updateCompetitions(true);
        }
    };
}
function updateGroups(){
    var request = new XMLHttpRequest();
    request.open('GET', url_prefix + '/org/groups');
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            groups = JSON.parse(request.responseText);
            setGroups();
            setTeacher();
        }
    };
    request.send();
}
function setGroups() {
    var new_inner = "";
    for (var group of groups) {
        new_inner += "<li id='g"+group.name+"' onclick=\"openGroup('" + group.name + "');\">";
        new_inner += group.name;new_inner += "</li>";
    }
    document.getElementById('groups-list').innerHTML = new_inner;
    if (opened_group != '-1') {
        openGroup(opened_group);
    }
}
function setGroupsFoot() {
    var inner = "";
    for (t of teachers){
        inner += '<option value="'+t.username+'">'+t.display_name+'</option>';
    }
    try {
        document.getElementById("group_teacher").innerHTML = inner;
    } catch {}
}
function openGroup(name) {
    try {
        var el = document.getElementById('g' + opened_group);
        el.className = '';
    } catch (error) { console.log(error); }
    opened_group = name;
    document.getElementById('g' + name).className = 'focused';
    document.getElementById('students-caption').innerText = `Студенты группы "${name}"`;
    var group = groups.filter(grp => grp.name == name);
    if (group.length == 0)
        return;
    group = group[0];
    var students = group.students
    var keys = Object.keys(students);
    var inner = "";
    for (var key of keys) {
        inner += "<tr>";
        inner += "<td>" + students[key].name + "</td>";
        inner += "<td>" + key + "</td>";
        //inner += "<td><button onclick='deleteStudent(\"" + key + "\")'>X</button></td>";
        inner += "</tr>";
    }
    var teachers_list = document.getElementById("teachers-list");
    var teachers_str = '';
    for (var t of group.teachers){
        teacher_now = teachers.filter(teacher => teacher.username == t);
        teachers_str += '<li>' + teacher_now[0].display_name + '</li>';
    }
    teachers_list.innerHTML = teachers_str;
    document.getElementById('students-body').innerHTML = inner;
}
function addGroup(name){
    console.log("Add group " + name);
    var request = new XMLHttpRequest();
    request.open('PUT', url_prefix + '/org/groups');
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    request.send('name=' + name);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            updateGroups();
        }
    };
}
function addStudent(name, id, group){
    console.log("Add student " + name + " with id " + id + " to group " + group);
    if (group == "-1") {
        return;
    }
    var request = new XMLHttpRequest();
    request.open('PUT', url_prefix + '/org/students');
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    request.send("name=" + name + "&group="+group+"&id="+id);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            updateGroups();
        }
    };
}
function deleteGroup(name){
    console.log("Delete group " + name);
    if (opened_group == name)
        opened_group = '-1';
    var request = new XMLHttpRequest();
    request.open('DELETE', url_prefix + '/org/groups');
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    request.send('name=' + name);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            updateGroups();
        }
    };
}
function deleteStudent(id){
    console.log("Delete student with id " + id);
    var request = new XMLHttpRequest();
    request.open('DELETE', url_prefix + '/org/students');
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    request.send("id=" + id);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            updateGroups();
        }
    };
}
function setTeacherOfGroup(group, teacher) {
    console.log("Set teacher of " + group + " to " + teacher);
    var request = new XMLHttpRequest();
    request.open('PATCH', url_prefix + '/org/groups');
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    request.send('newTeacher=' + teacher + 
                 '&group=' + group);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            updateGroups();
        }
    };
}