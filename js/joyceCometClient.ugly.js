var joyceCometClient=function(){var a=function(a,b){this.client=a,this.token=null,this.queue_out=[],this.pending_requests=0,this.message="message"in b?b.message:function(){},this.stream="stream"in b?b.stream:function(){},this.ready="ready"in b?b.ready:function(){},this.stream_url=null};a.prototype.run=function(){this._request(!1)},a.prototype._request=function(a){if(a&&this.pending_requests>=2||!a&&this.pending_requests>=1)return;this.pending_requests++;var b=[];this.token!=null&&(b.push(this.token),$.merge(b,this.queue_out),this.queue_out=[]);var c="http://"+this.client.host+":"+this.client.port.toString()+this.client.path,d=this;$.ajax({url:c,type:"POST",jsonp:"c",data:{m:JSON.stringify(b)},dataType:"jsonp",error:function(a,b,c){d.on_error(a,b,c)},success:function(a,b,c){d.on_success(a,b,c)}})},a.prototype.on_success=function(a,b,c){var d=!1;this.pending_requests--;if(this.token!=null&&a[0]!=this.token){alert("error: token changed: "+this.token+" != "+a[0]);return}this.token==null&&(this.token=a[0],this.stream_url="http://"+this.client.host+":"+this.client.port.toString()+this.client.path+"?m="+this.token+"&r=fu",d=!0);for(var e=0;e<a[1].length;e++)this.message(a[1][e]);this._request(!1),d&&this.ready()},a.prototype.send_messages=function(a){$.merge(this.queue_out,a),this.token!=null&&this._request(!0)},a.prototype.send_message=function(a){this.queue_out.push(a),this.token!=null&&this._request(!0)},a.prototype.on_error=function(a,b,c){console.error([b,c])};var b=function(a){this.host="host"in a?a.host:"localhost",this.port="port"in a?a.port:8080,this.path="path"in a?a.path:"/"};return b.prototype.create_channel=function(b){var c=new a(this,b);return c.run(),c},b}();