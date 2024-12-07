var mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/mydb', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
var db = mongoose.connection;
// create an schema
var doctorSchema = new mongoose.Schema({
    name: String,
    email: String,
    phno: String,
    password: String,
    speciality: String,
    registeration: String
});
doctorTable = mongoose.model('doctors', doctorSchema);

module.exports = {

    fetchData: function(callback) {
        var doctorData = doctorTable.find({});
        doctorData.exec(function(err, data) {
            if (err) throw err;
            return callback(data);
        })

    }
}